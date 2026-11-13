import type { CalendarId, DoorId } from '../shared/shared.model.js';
import type { Calendar } from '../calendars/calendars.model.js';
import type {
  Door,
  DoorContent,
  DraftDoor,
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

/** Stores published doors. Numbers are not unique while a publish renumbers. */
export interface DoorWriter {
  /** @throws ConflictError when the id is taken. */
  create(door: Door): Promise<void>;
  /**
   * Replaces a door.
   *
   * @throws NotFoundError when no door has this id.
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
 * Invariants: a door whose `opensAt` is after `now` is `locked` and carries no content, and a
 * hidden one is not shown at all (null); a door with `firstOpenedAt` set and `opensAt` passed is
 * `opened` with its content; otherwise `ready`.
 */
export interface RecipientDoorPresenter {
  /** @returns null when she must not know the door exists yet. */
  present(door: Door, now: Date): RecipientDoor | null;
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

/** Reads the doors the admin is writing. */
export interface DraftDoorReader {
  /** @throws NotFoundError when no draft door has this id. */
  getById(id: DoorId): Promise<DraftDoor>;
  /** The calendar's draft doors, by `opensOn`, then `addedAt`. */
  listByCalendar(calendarId: CalendarId): Promise<DraftDoor[]>;
}

/** Stores the doors the admin is writing. */
export interface DraftDoorWriter {
  /** @throws ConflictError when the id is taken. */
  create(door: DraftDoor): Promise<void>;
  /** Replaces a draft door. @throws NotFoundError when no draft door has this id. */
  save(door: DraftDoor): Promise<void>;
  /** @throws NotFoundError when no draft door has this id. */
  remove(id: DoorId): Promise<void>;
}

/** A door's place in its calendar: what numbering needs to know. */
export interface DoorOrderKey {
  readonly id: DoorId;
  readonly opensAt: Date;
  readonly addedAt: Date;
}

/** Numbers doors by when they open: door 1 is the earliest. */
export interface DoorNumberCalculator {
  /**
   * @returns the doors in number order (door n at index n − 1): by `opensAt`, then `addedAt`, then
   * id, so the same doors always get the same numbers.
   */
  ordered<T extends DoorOrderKey>(doors: readonly T[]): T[];
}

/**
 * A calendar's draft as the admin sees it: each draft door scheduled in the calendar's time zone,
 * numbered by date, with the recipient's progress from the published door of the same id.
 */
export interface DraftDoorPresenter {
  /** @returns the previews in door order. */
  present(
    calendar: Calendar,
    drafts: readonly DraftDoor[],
    published: readonly Door[],
  ): DoorPreview[];
  /**
   * @returns one draft door's preview, numbered among the others.
   * @throws NotFoundError when `id` is not among the drafts.
   */
  presentOne(
    calendar: Calendar,
    drafts: readonly DraftDoor[],
    published: readonly Door[],
    id: DoorId,
  ): DoorPreview;
}
