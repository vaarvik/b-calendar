import type { CalendarId, DoorId } from '../shared/shared.model.js';
import type {
  Door,
  DoorContent,
  DoorLink,
  DoorPreview,
  OpenDoorContent,
  RecipientDoor,
} from './doors.model.js';

/** Reads doors. */
export interface DoorReader {
  /** @throws NotFoundError when no door has this id. */
  getById(id: DoorId): Promise<Door>;
  /** The calendar's doors by number, ascending. */
  listByCalendar(calendarId: CalendarId): Promise<Door[]>;
  /** Doors of any calendar that opened at or before `at` and have not been notified, oldest first. */
  listUnnotified(at: Date): Promise<Door[]>;
}

/** Stores doors. */
export interface DoorWriter {
  /** @throws ConflictError when the id, or the number within the calendar, is taken. */
  create(door: Door): Promise<void>;
  /**
   * Replaces a door.
   *
   * @throws NotFoundError when no door has this id.
   * @throws ConflictError when another door of the calendar has the number.
   */
  save(door: Door): Promise<void>;
  /** @throws NotFoundError when no door has this id. */
  remove(id: DoorId): Promise<void>;
}

/** Recognises songs and videos so they can be embedded. */
export interface DoorLinkClassifier {
  classify(url: string): DoorLink;
}

/**
 * The one rule that keeps the surprise: what the recipient may see of a door at a time.
 * Invariants: a door whose `opensAt` is after `now` is `locked` and carries no content; a door
 * with `firstOpenedAt` set and `opensAt` passed is `opened` with its content; otherwise `ready`.
 */
export interface RecipientDoorPresenter {
  present(door: Door, now: Date): RecipientDoor;
  /** @returns the content of an open door. */
  content(content: DoorContent): OpenDoorContent;
}

/** Turns a door's day and time of day into the instant it opens. */
export interface DoorScheduleCalculator {
  /**
   * @param opensOn `YYYY-MM-DD`
   * @param time `HH:MM`, wall-clock time in `timeZone` (daylight saving included)
   * @returns the instant; a time skipped by a daylight saving change counts as the hour after.
   */
  opensAt(opensOn: string, time: string, timeZone: string): Date;
}

/** A door as the admin sees it, with its link classified. */
export interface DoorPreviewPresenter {
  preview(door: Door): DoorPreview;
}
