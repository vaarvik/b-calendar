import type { CalendarAccess } from '../calendars/calendars.model.js';
import type { CommentId, DoorId } from '../shared/shared.model.js';
import type { DoorComment } from './comments.model.js';

export interface DoorCommentsInput extends CalendarAccess {
  readonly number: number;
}

export interface AddDoorCommentInput extends DoorCommentsInput {
  /** A follower's name; her link writes with her name, and ignores this. */
  readonly author?: string;
  readonly text: string;
}

/**
 * Someone with a link comments behind a door. Only on a door she can see that has opened, so a
 * comment never gives a locked or secret door away.
 */
export interface AddDoorComment {
  /**
   * @throws UnauthenticatedError when the slug or the key is wrong.
   * @throws NotFoundError when there is no such door, or it is secret and has not opened.
   * @throws DoorLockedError when the door has not opened yet.
   * @throws ValidationError when the text is empty or too long, or a follower gave no name.
   */
  execute(input: AddDoorCommentInput): Promise<DoorComment>;
}

/** The comments behind a door, oldest first, under the same rule as adding one. */
export interface ListDoorComments {
  /**
   * @throws UnauthenticatedError when the slug or the key is wrong.
   * @throws NotFoundError when there is no such door, or it is secret and has not opened.
   * @throws DoorLockedError when the door has not opened yet.
   */
  execute(input: DoorCommentsInput): Promise<DoorComment[]>;
}

/** The admin's view of a door's comments: any door, oldest first. */
export interface ListAdminDoorComments {
  execute(input: { readonly doorId: DoorId }): Promise<DoorComment[]>;
}

/** The admin removes a comment. */
export interface RemoveDoorComment {
  /** @throws NotFoundError when the comment does not exist. */
  execute(input: { readonly commentId: CommentId }): Promise<void>;
}
