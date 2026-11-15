import {
  AdminCredentialsSchema,
  CalendarDetailsResponseDtoSchema,
  CalendarDtoSchema,
  CalendarIdSchema,
  CalendarListResponseDtoSchema,
  CalendarSettingsSchema,
  CalendarVersionDtoSchema,
  DoorDraftSchema,
  DoorIdSchema,
  DoorPreviewDtoSchema,
  LogInResponseDtoSchema,
  SendTestNotificationResponseDtoSchema,
} from '@b-calendar/contracts';
import type { InputValidator } from '@b-calendar/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AdminUseCases } from './admin.model.js';
import type {
  AdminRequestAuthenticator,
  HttpController,
  HttpDtoMapper,
} from '../shared/shared.ports.js';

const CalendarParamsSchema = z.object({ calendarId: CalendarIdSchema });
const DoorParamsSchema = z.object({ doorId: DoorIdSchema });

/** The admin's side: everything under `/v1/admin`, behind a session. */
export class AdminController implements HttpController {
  public constructor(
    private readonly useCases: AdminUseCases,
    private readonly admin: AdminRequestAuthenticator,
    private readonly validator: InputValidator,
    private readonly dtos: HttpDtoMapper,
  ) {}

  public register(app: FastifyInstance): void {
    const { useCases } = this;

    app.post('/v1/admin/session', async (request) => {
      const credentials = this.validator.validate(AdminCredentialsSchema, request.body);
      const session = await useCases.logIn.execute(credentials);
      return LogInResponseDtoSchema.parse({
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
      });
    });

    app.get('/v1/admin/calendars', async (request) => {
      this.admin.requireAdmin(request);
      const calendars = await useCases.listCalendars.execute();
      return CalendarListResponseDtoSchema.parse({
        calendars: calendars.map((calendar) => this.dtos.calendar(calendar)),
      });
    });

    app.post('/v1/admin/calendars', async (request, reply) => {
      this.admin.requireAdmin(request);
      const settings = this.validator.validate(CalendarSettingsSchema, request.body);
      const calendar = await useCases.createCalendar.execute(settings);
      return reply.status(201).send(CalendarDtoSchema.parse(this.dtos.calendar(calendar)));
    });

    app.get('/v1/admin/calendars/:calendarId', async (request) => {
      const calendarId = this.calendarId(request);
      const details = await useCases.getCalendarDetails.execute({ calendarId });
      return CalendarDetailsResponseDtoSchema.parse(this.dtos.calendarDetails(details));
    });

    app.put('/v1/admin/calendars/:calendarId', async (request) => {
      const calendarId = this.calendarId(request);
      const settings = this.validator.validate(CalendarSettingsSchema, request.body);
      const calendar = await useCases.updateCalendar.execute({ calendarId, settings });
      return CalendarDtoSchema.parse(this.dtos.calendar(calendar));
    });

    app.post('/v1/admin/calendars/:calendarId/key', async (request) => {
      const calendarId = this.calendarId(request);
      const calendar = await useCases.rotateCalendarKey.execute({ calendarId });
      return CalendarDtoSchema.parse(this.dtos.calendar(calendar));
    });

    app.post('/v1/admin/calendars/:calendarId/publish', async (request) => {
      const calendarId = this.calendarId(request);
      const version = await useCases.publishCalendar.execute({ calendarId });
      return CalendarVersionDtoSchema.parse(this.dtos.calendarVersion(version));
    });

    app.post('/v1/admin/calendars/:calendarId/test-notification', async (request) => {
      const calendarId = this.calendarId(request);
      const output = await useCases.sendTestNotification.execute({ calendarId });
      return SendTestNotificationResponseDtoSchema.parse(output);
    });

    app.post('/v1/admin/calendars/:calendarId/doors', async (request, reply) => {
      const calendarId = this.calendarId(request);
      const door = await useCases.addDoor.execute({ calendarId, draft: this.draft(request) });
      return reply.status(201).send(DoorPreviewDtoSchema.parse(this.dtos.doorPreview(door)));
    });

    app.put('/v1/admin/doors/:doorId', async (request) => {
      const doorId = this.doorId(request);
      const door = await useCases.editDoor.execute({ doorId, draft: this.draft(request) });
      return DoorPreviewDtoSchema.parse(this.dtos.doorPreview(door));
    });

    app.delete('/v1/admin/doors/:doorId', async (request, reply) => {
      const doorId = this.doorId(request);
      await useCases.removeDoor.execute({ doorId });
      return reply.status(204).send();
    });
  }

  private calendarId(request: FastifyRequest) {
    this.admin.requireAdmin(request);
    return this.validator.validate(CalendarParamsSchema, request.params).calendarId;
  }

  private doorId(request: FastifyRequest) {
    this.admin.requireAdmin(request);
    return this.validator.validate(DoorParamsSchema, request.params).doorId;
  }

  private draft(request: FastifyRequest) {
    return this.validator.validate(DoorDraftSchema, request.body);
  }
}
