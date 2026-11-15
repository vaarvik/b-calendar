import {
  CalendarIdSchema,
  MemberDtoSchema,
  MemberIdSchema,
  MemberNameRequestDtoSchema,
} from '@b-calendar/contracts';
import type { CalendarOwnershipChecker, InputValidator, MemberId } from '@b-calendar/contracts';
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
    private readonly ownership: CalendarOwnershipChecker,
    private readonly validator: InputValidator,
    private readonly dtos: HttpDtoMapper,
  ) {}

  public register(app: FastifyInstance): void {
    const { addMember, renameMember, rotateMemberKey, removeMember } = this.useCases;

    app.post('/v1/admin/calendars/:calendarId/members', async (request, reply) => {
      const owner = this.admin.requireAdmin(request);
      const { calendarId } = this.validator.validate(CalendarParamsSchema, request.params);
      await this.ownership.calendar(owner, calendarId);
      const { name } = this.validator.validate(MemberNameRequestDtoSchema, request.body);
      const member = await addMember.execute({ calendarId, name });
      return reply.status(201).send(MemberDtoSchema.parse(this.dtos.member(member)));
    });

    app.put('/v1/admin/members/:memberId', async (request) => {
      const memberId = await this.memberId(request);
      const { name } = this.validator.validate(MemberNameRequestDtoSchema, request.body);
      const member = await renameMember.execute({ memberId, name });
      return MemberDtoSchema.parse(this.dtos.member(member));
    });

    app.post('/v1/admin/members/:memberId/key', async (request) => {
      const memberId = await this.memberId(request);
      const member = await rotateMemberKey.execute({ memberId });
      return MemberDtoSchema.parse(this.dtos.member(member));
    });

    app.delete('/v1/admin/members/:memberId', async (request, reply) => {
      const memberId = await this.memberId(request);
      await removeMember.execute({ memberId });
      return reply.status(204).send();
    });
  }

  /** The member in the path, once their calendar is the signed-in owner's. */
  private async memberId(request: FastifyRequest): Promise<MemberId> {
    const owner = this.admin.requireAdmin(request);
    const { memberId } = this.validator.validate(MemberParamsSchema, request.params);
    await this.ownership.member(owner, memberId);
    return memberId;
  }
}
