import {
  AddDoorCommentRequestDtoSchema,
  CalendarAccessSchema,
  CommentIdSchema,
  DoorCommentDtoSchema,
  DoorCommentsResponseDtoSchema,
  DoorIdSchema,
  UnauthenticatedError,
} from '@b-calendar/contracts';
import type { CalendarAccess, InputValidator } from '@b-calendar/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { CommentUseCases } from './comments.model.js';
import type {
  AdminRequestAuthenticator,
  HttpController,
  HttpDtoMapper,
} from '../shared/shared.ports.js';

const DoorParamsSchema = z.object({ slug: z.string(), number: z.coerce.number().int().min(1) });
const AdminDoorParamsSchema = z.object({ doorId: DoorIdSchema });
const CommentParamsSchema = z.object({ commentId: CommentIdSchema });

/**
 * Comments behind a door: anyone with a link reads and writes them (the key in `x-access-key`),
 * the admin reads and removes them.
 */
export class CommentsController implements HttpController {
  public constructor(
    private readonly useCases: CommentUseCases,
    private readonly admin: AdminRequestAuthenticator,
    private readonly validator: InputValidator,
    private readonly dtos: HttpDtoMapper,
  ) {}

  public register(app: FastifyInstance): void {
    const { addDoorComment, listDoorComments, listAdminDoorComments, removeDoorComment } =
      this.useCases;

    app.get('/v1/calendars/:slug/doors/:number/comments', async (request, reply) => {
      const comments = await listDoorComments.execute(this.door(request));
      return reply.header('cache-control', 'no-store').send(
        DoorCommentsResponseDtoSchema.parse({
          comments: comments.map((comment) => this.dtos.comment(comment)),
        }),
      );
    });

    app.post('/v1/calendars/:slug/doors/:number/comments', async (request, reply) => {
      const body = this.validator.validate(AddDoorCommentRequestDtoSchema, request.body);
      const comment = await addDoorComment.execute({ ...this.door(request), ...body });
      return reply.status(201).send(DoorCommentDtoSchema.parse(this.dtos.comment(comment)));
    });

    app.get('/v1/admin/doors/:doorId/comments', async (request) => {
      this.admin.requireAdmin(request);
      const { doorId } = this.validator.validate(AdminDoorParamsSchema, request.params);
      const comments = await listAdminDoorComments.execute({ doorId });
      return DoorCommentsResponseDtoSchema.parse({
        comments: comments.map((comment) => this.dtos.comment(comment)),
      });
    });

    app.delete('/v1/admin/comments/:commentId', async (request, reply) => {
      this.admin.requireAdmin(request);
      const { commentId } = this.validator.validate(CommentParamsSchema, request.params);
      await removeDoorComment.execute({ commentId });
      return reply.status(204).send();
    });
  }

  private door(request: FastifyRequest): CalendarAccess & { readonly number: number } {
    const { slug, number } = this.validator.validate(DoorParamsSchema, request.params);
    const parsed = CalendarAccessSchema.safeParse({
      slug,
      accessKey: request.headers['x-access-key'],
    });
    if (!parsed.success) {
      throw new UnauthenticatedError('This link does not open a calendar.');
    }
    return { ...parsed.data, number };
  }
}
