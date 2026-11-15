import type { CalendarId, DoorId, MemberId } from '../shared/shared.model.js';
import type { Calendar, CalendarAccess, CalendarViewer } from '../calendars/calendars.model.js';
import type {
  Door,
  DoorContent,
  DraftDoor,
  DoorLink,
  DoorOpening,
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

/** Reads which members have opened which doors. */
export interface DoorOpeningReader {
  /** The doors a member has opened, by `openedAt`; `[]` when none. */
  listByMember(memberId: MemberId): Promise<DoorOpening[]>;
  /** Every opening of the calendar's doors, by `openedAt`. */
  listByCalendar(calendarId: CalendarId): Promise<DoorOpening[]>;
}

/** Records a member's first look behind a door. */
export interface DoorOpeningWriter {
  /** @throws ConflictError when the member has already opened the door. */
  create(opening: DoorOpening): Promise<void>;
}

/**
 * The one rule that keeps the surprise: what one link may see of a door at a time.
 * Invariants: a door whose `opensAt` is after `now` is `locked` and carries no content, and a
 * hidden one is not shown at all (null); a door the viewer opened (`openedAt`) whose `opensAt`
 * has passed is `opened` with its content; otherwise `ready`.
 */
export interface RecipientDoorPresenter {
  /**
   * @param openedAt when this viewer first opened the door; null when they have not (always, on
   * the follower link).
   * @returns null when they must not know the door exists yet.
   */
  present(door: Door, now: Date, openedAt: Date | null): RecipientDoor | null;
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

/** A door as the admin sees it, with its link classified and who has opened it. */
export interface DoorPreviewPresenter {
  /** @param openings of any doors; only this door's are kept. */
  preview(door: Door, openings: readonly DoorOpening[]): DoorPreview;
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

/** The progress a draft door shows: from the published door of the same id. */
export interface DoorProgress {
  readonly published: readonly Door[];
  readonly openings: readonly DoorOpening[];
}

/**
 * A calendar's draft as the admin sees it: each draft door scheduled in the calendar's time zone,
 * numbered by date, with the progress on the published door of the same id.
 */
export interface DraftDoorPresenter {
  /** @returns the previews in door order. */
  present(calendar: Calendar, drafts: readonly DraftDoor[], progress: DoorProgress): DoorPreview[];
  /**
   * @returns one draft door's preview, numbered among the others.
   * @throws NotFoundError when `id` is not among the drafts.
   */
  presentOne(
    calendar: Calendar,
    drafts: readonly DraftDoor[],
    progress: DoorProgress,
    id: DoorId,
  ): DoorPreview;
}

/**
 * Finds a door someone with a link may see behind: one that is shown on their link and has
 * opened. The rule comments and opening share, so nothing leaks before its time.
 */
export interface OpenedDoorLocator {
  /**
   * @throws UnauthenticatedError when the slug or the key is wrong.
   * @throws NotFoundError when there is no such door, or it is secret and has not opened.
   * @throws DoorLockedError when the door has not opened yet.
   */
  locate(
    access: CalendarAccess & { readonly number: number },
  ): Promise<{ readonly viewer: CalendarViewer; readonly door: Door }>;
}
