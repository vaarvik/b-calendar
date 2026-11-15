import { COMMENT_ROLES, NotFoundError } from '@b-calendar/contracts';
import type {
  CommentId,
  DoorComment,
  DoorCommentReader,
  DoorCommentWriter,
  DoorId,
  MemberId,
} from '@b-calendar/contracts';
import type { Kysely } from 'kysely';
import { z } from 'zod';
import type { Database } from '../shared/shared.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

const RowSchema = z.object({ role: z.enum(COMMENT_ROLES) });

export class PgDoorCommentRepository implements DoorCommentReader, DoorCommentWriter {
  public constructor(
    private readonly db: Kysely<Database>,
    private readonly errors: DatabaseErrorTranslator,
  ) {}

  public async listByDoor(doorId: DoorId): Promise<DoorComment[]> {
    const rows = await this.db
      .selectFrom('door_comments')
      .selectAll()
      .where('door_id', '=', doorId)
      .orderBy('created_at')
      .execute();
    return rows.map((row) => ({
      id: row.id as CommentId,
      doorId: row.door_id as DoorId,
      author: row.author,
      role: RowSchema.parse(row).role,
      memberId: row.member_id as MemberId | null,
      text: row.text,
      createdAt: row.created_at,
    }));
  }

  public async create(comment: DoorComment): Promise<void> {
    try {
      await this.db
        .insertInto('door_comments')
        .values({
          id: comment.id,
          door_id: comment.doorId,
          author: comment.author,
          role: comment.role,
          member_id: comment.memberId,
          text: comment.text,
          created_at: comment.createdAt,
        })
        .execute();
    } catch (error) {
      throw this.errors.translate(error);
    }
  }

  public async remove(id: CommentId): Promise<void> {
    const result = await this.db
      .deleteFrom('door_comments')
      .where('id', '=', id)
      .executeTakeFirst();
    if (result.numDeletedRows === 0n) {
      throw new NotFoundError('DoorComment', id);
    }
  }
}
