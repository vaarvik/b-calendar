import { ConflictError, NotFoundError } from '@b-calendar/contracts';
import type {
  CommentId,
  DoorComment,
  DoorCommentReader,
  DoorCommentWriter,
  DoorId,
} from '@b-calendar/contracts';

/** Comments in a map. Copies on the way in and out, like a database would. */
export class InMemoryDoorCommentRepository implements DoorCommentReader, DoorCommentWriter {
  private readonly rows = new Map<CommentId, DoorComment>();

  public listByDoor(doorId: DoorId): Promise<DoorComment[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((comment) => comment.doorId === doorId)
        .map((comment) => structuredClone(comment))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    );
  }

  public create(comment: DoorComment): Promise<void> {
    if (this.rows.has(comment.id)) {
      return Promise.reject(new ConflictError(`Comment ${comment.id} exists.`));
    }
    this.rows.set(comment.id, structuredClone(comment));
    return Promise.resolve();
  }

  public remove(id: CommentId): Promise<void> {
    if (!this.rows.delete(id)) {
      return Promise.reject(new NotFoundError('DoorComment', id));
    }
    return Promise.resolve();
  }
}
