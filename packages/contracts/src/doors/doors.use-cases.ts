import type { CalendarAccess } from '../calendars/calendars.model.js';
import type { CalendarId, DoorId } from '../shared/shared.model.js';
import type { DoorDraft, DoorPreview, OpenDoorContent } from './doors.model.js';

export interface OpenDoorInput extends CalendarAccess {
  readonly number: number;
}

export interface OpenDoorOutput {
  readonly number: number;
  readonly opensAt: Date;
  readonly content: OpenDoorContent;
}

/**
 * A member opens a door, or looks behind one they opened before. The first time is recorded for
 * them alone: the door then stays open on their link, and the admin sees they opened it. A
 * follower's link shows the content and records nothing.
 */
export interface OpenDoor {
  /**
   * @throws UnauthenticatedError when the slug or the key is wrong.
   * @throws NotFoundError when the calendar has no door with this number, or it is hidden and
   * has not opened (the same answer, so a secret door cannot be guessed).
   * @throws DoorLockedError when the door has not opened yet.
   */
  execute(input: OpenDoorInput): Promise<OpenDoorOutput>;
}

export interface AddDoorInput {
  readonly calendarId: CalendarId;
  readonly draft: DoorDraft;
}

/** An admin adds a door to the draft. The members get it with the next publish. */
export interface AddDoor {
  /**
   * @throws ValidationError when the draft is invalid.
   * @throws NotFoundError when the calendar does not exist.
   */
  execute(input: AddDoorInput): Promise<DoorPreview>;
}

export interface EditDoorInput {
  readonly doorId: DoorId;
  readonly draft: DoorDraft;
}

/** An admin changes a draft door, as she types. The members get it with the next publish. */
export interface EditDoor {
  /**
   * @throws ValidationError when the draft is invalid.
   * @throws NotFoundError when the draft door does not exist.
   */
  execute(input: EditDoorInput): Promise<DoorPreview>;
}

/** An admin removes a door from the draft. It leaves the calendar with the next publish. */
export interface RemoveDoor {
  /** @throws NotFoundError when the draft door does not exist. */
  execute(input: { readonly doorId: DoorId }): Promise<void>;
}
