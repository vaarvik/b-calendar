import { NotFoundError } from '@b-calendar/contracts';
import type {
  CalendarRole,
  CommentId,
  DoorComment,
  DoorCommentReader,
  DoorCommentWriter,
  DoorId,
} from '@b-calendar/contracts';
import type { Kysely } from 'kysely';
import type { Database } from '../shared/shared.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

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
      role: row.role as CalendarRole,
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
