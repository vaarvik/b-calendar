import type { CommentId, DoorId } from '../shared/shared.model.js';
import type { DoorComment } from './comments.model.js';

/** Reads comments. */
export interface DoorCommentReader {
  /** A door's comments, oldest first; `[]` when there are none. */
  listByDoor(doorId: DoorId): Promise<DoorComment[]>;
}

/** Stores comments. */
export interface DoorCommentWriter {
  /** @throws ConflictError when the id is taken. */
  create(comment: DoorComment): Promise<void>;
  /** @throws NotFoundError when no comment has this id. */
  remove(id: CommentId): Promise<void>;
}
