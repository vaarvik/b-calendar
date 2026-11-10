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
 * The recipient opens a door, or looks behind one she opened before. The first time is recorded:
 * the door then stays open, and the admin sees she opened it.
 */
export interface OpenDoor {
  /**
   * @throws UnauthenticatedError when the slug or the key is wrong.
   * @throws NotFoundError when the calendar has no door with this number.
   * @throws DoorLockedError when the door has not opened yet.
   */
  execute(input: OpenDoorInput): Promise<OpenDoorOutput>;
}

export interface AddDoorInput {
  readonly calendarId: CalendarId;
  readonly draft: DoorDraft;
}

/** An admin adds a door. */
export interface AddDoor {
  /**
   * @throws ValidationError when the draft is invalid.
   * @throws NotFoundError when the calendar does not exist.
   * @throws ConflictError when the number is taken.
   */
  execute(input: AddDoorInput): Promise<DoorPreview>;
}

export interface EditDoorInput {
  readonly doorId: DoorId;
  readonly draft: DoorDraft;
}

/**
 * An admin changes a door. Moving `opensAt` into the future makes it notify again; the
 * recipient's first look is kept.
 */
export interface EditDoor {
  /**
   * @throws ValidationError when the draft is invalid.
   * @throws NotFoundError when the door does not exist.
   * @throws ConflictError when the number is taken.
   */
  execute(input: EditDoorInput): Promise<DoorPreview>;
}

/** An admin removes a door. */
export interface RemoveDoor {
  /** @throws NotFoundError when the door does not exist. */
  execute(input: { readonly doorId: DoorId }): Promise<void>;
}
