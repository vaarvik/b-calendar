import {
  CalendarDetailsResponseDtoSchema,
  CalendarDtoSchema,
  CalendarIdSchema,
  CalendarListResponseDtoSchema,
  CalendarSettingsSchema,
  CalendarVersionDtoSchema,
  DoorDraftSchema,
  DoorIdSchema,
  DoorPreviewDtoSchema,
  SendTestNotificationResponseDtoSchema,
} from '@b-calendar/contracts';
import type { CalendarOwnershipChecker, InputValidator } from '@b-calendar/contracts';
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

/**
 * The owner's side: everything under `/v1/admin`, behind a session, on the signed-in owner's
 * calendars only.
 */
export class AdminController implements HttpController {
  public constructor(
    private readonly useCases: AdminUseCases,
    private readonly admin: AdminRequestAuthenticator,
    private readonly ownership: CalendarOwnershipChecker,
    private readonly validator: InputValidator,
    private readonly dtos: HttpDtoMapper,
  ) {}

  public register(app: FastifyInstance): void {
    const { useCases } = this;

    app.get('/v1/admin/calendars', async (request) => {
      const owner = this.admin.requireAdmin(request);
      const calendars = await useCases.listCalendars.execute({ owner });
      return CalendarListResponseDtoSchema.parse({
        calendars: calendars.map((calendar) => this.dtos.calendar(calendar)),
      });
    });

    app.post('/v1/admin/calendars', async (request, reply) => {
      const owner = this.admin.requireAdmin(request);
      const settings = this.validator.validate(CalendarSettingsSchema, request.body);
      const calendar = await useCases.createCalendar.execute({ owner, settings });
      return reply.status(201).send(CalendarDtoSchema.parse(this.dtos.calendar(calendar)));
    });

    app.get('/v1/admin/calendars/:calendarId', async (request) => {
      const calendarId = await this.calendarId(request);
      const details = await useCases.getCalendarDetails.execute({ calendarId });
      return CalendarDetailsResponseDtoSchema.parse(this.dtos.calendarDetails(details));
    });

    app.put('/v1/admin/calendars/:calendarId', async (request) => {
      const calendarId = await this.calendarId(request);
      const settings = this.validator.validate(CalendarSettingsSchema, request.body);
      const calendar = await useCases.updateCalendar.execute({ calendarId, settings });
      return CalendarDtoSchema.parse(this.dtos.calendar(calendar));
    });

    app.post('/v1/admin/calendars/:calendarId/key', async (request) => {
      const calendarId = await this.calendarId(request);
      const calendar = await useCases.rotateCalendarKey.execute({ calendarId });
      return CalendarDtoSchema.parse(this.dtos.calendar(calendar));
    });

    app.post('/v1/admin/calendars/:calendarId/publish', async (request) => {
      const calendarId = await this.calendarId(request);
      const version = await useCases.publishCalendar.execute({ calendarId });
      return CalendarVersionDtoSchema.parse(this.dtos.calendarVersion(version));
    });

    app.post('/v1/admin/calendars/:calendarId/test-notification', async (request) => {
      const calendarId = await this.calendarId(request);
      const output = await useCases.sendTestNotification.execute({ calendarId });
      return SendTestNotificationResponseDtoSchema.parse(output);
    });

    app.post('/v1/admin/calendars/:calendarId/doors', async (request, reply) => {
      const calendarId = await this.calendarId(request);
      const door = await useCases.addDoor.execute({ calendarId, draft: this.draft(request) });
      return reply.status(201).send(DoorPreviewDtoSchema.parse(this.dtos.doorPreview(door)));
    });

    app.put('/v1/admin/doors/:doorId', async (request) => {
      const doorId = await this.doorId(request);
      const door = await useCases.editDoor.execute({ doorId, draft: this.draft(request) });
      return DoorPreviewDtoSchema.parse(this.dtos.doorPreview(door));
    });

    app.delete('/v1/admin/doors/:doorId', async (request, reply) => {
      const doorId = await this.doorId(request);
      await useCases.removeDoor.execute({ doorId });
      return reply.status(204).send();
    });
  }

  /** The calendar in the path, once it is the signed-in owner's. */
  private async calendarId(request: FastifyRequest) {
    const owner = this.admin.requireAdmin(request);
    const { calendarId } = this.validator.validate(CalendarParamsSchema, request.params);
    await this.ownership.calendar(owner, calendarId);
    return calendarId;
  }

  /** The door in the path, once its calendar is the signed-in owner's. */
  private async doorId(request: FastifyRequest) {
    const owner = this.admin.requireAdmin(request);
    const { doorId } = this.validator.validate(DoorParamsSchema, request.params);
    await this.ownership.door(owner, doorId);
    return doorId;
  }

  private draft(request: FastifyRequest) {
    return this.validator.validate(DoorDraftSchema, request.body);
  }
}
