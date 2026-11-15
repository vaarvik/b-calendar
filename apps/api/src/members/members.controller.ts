import {
  CalendarIdSchema,
  MemberDtoSchema,
  MemberIdSchema,
  MemberNameRequestDtoSchema,
} from '@b-calendar/contracts';
import type { InputValidator, MemberId } from '@b-calendar/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { MemberUseCases } from './members.model.js';
import type {
  AdminRequestAuthenticator,
  HttpController,
  HttpDtoMapper,
} from '../shared/shared.ports.js';

const CalendarParamsSchema = z.object({ calendarId: CalendarIdSchema });
const MemberParamsSchema = z.object({ memberId: MemberIdSchema });

/** The admin adds, renames, re-keys and removes the people sharing a calendar. */
export class MembersController implements HttpController {
  public constructor(
    private readonly useCases: MemberUseCases,
    private readonly admin: AdminRequestAuthenticator,
    private readonly validator: InputValidator,
    private readonly dtos: HttpDtoMapper,
  ) {}

  public register(app: FastifyInstance): void {
    const { addMember, renameMember, rotateMemberKey, removeMember } = this.useCases;

    app.post('/v1/admin/calendars/:calendarId/members', async (request, reply) => {
      this.admin.requireAdmin(request);
      const { calendarId } = this.validator.validate(CalendarParamsSchema, request.params);
      const { name } = this.validator.validate(MemberNameRequestDtoSchema, request.body);
      const member = await addMember.execute({ calendarId, name });
      return reply.status(201).send(MemberDtoSchema.parse(this.dtos.member(member)));
    });

    app.put('/v1/admin/members/:memberId', async (request) => {
      const memberId = this.memberId(request);
      const { name } = this.validator.validate(MemberNameRequestDtoSchema, request.body);
      const member = await renameMember.execute({ memberId, name });
      return MemberDtoSchema.parse(this.dtos.member(member));
    });

    app.post('/v1/admin/members/:memberId/key', async (request) => {
      const memberId = this.memberId(request);
      const member = await rotateMemberKey.execute({ memberId });
      return MemberDtoSchema.parse(this.dtos.member(member));
    });

    app.delete('/v1/admin/members/:memberId', async (request, reply) => {
      const memberId = this.memberId(request);
      await removeMember.execute({ memberId });
      return reply.status(204).send();
    });
  }

  private memberId(request: FastifyRequest): MemberId {
    this.admin.requireAdmin(request);
    return this.validator.validate(MemberParamsSchema, request.params).memberId;
  }
}
