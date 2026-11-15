import type { CalendarId, AccountId, CommentId, DoorId, MemberId } from '../shared/shared.model.js';
import type {
  Calendar,
  CalendarAccess,
  CalendarVersion,
  CalendarViewer,
} from './calendars.model.js';

/** Reads calendars. */
export interface CalendarReader {
  /** @throws NotFoundError when no calendar has this id. */
  getById(id: CalendarId): Promise<Calendar>;
  findBySlug(slug: string): Promise<Calendar | null>;
  /** The owner's calendars (null: those nobody owns), newest first. */
  listByOwner(owner: AccountId): Promise<Calendar[]>;
}

/** Stores calendars. */
export interface CalendarWriter {
  /** @throws ConflictError when the id or the slug is taken. */
  create(calendar: Calendar): Promise<void>;
  /**
   * Replaces a calendar.
   *
   * @throws NotFoundError when no calendar has this id.
   * @throws ConflictError when another calendar has the slug.
   */
  save(calendar: Calendar): Promise<void>;
}

/** Checks a link. Shared by everything done with one. */
export interface CalendarAccessAuthenticator {
  /**
   * @returns the calendar the slug and key open, and whether the key is a member's (which one)
   * or the followers'.
   * @throws UnauthenticatedError when the slug is unknown or the key is wrong (one error for both,
   * so a wrong guess does not tell which calendars exist).
   */
  authenticate(access: CalendarAccess): Promise<CalendarViewer>;
}

/** Reads a calendar's published versions. */
export interface CalendarVersionReader {
  /** Newest first; `[]` before the first publish. */
  listByCalendar(calendarId: CalendarId): Promise<CalendarVersion[]>;
}

/** Stores published versions. Versions are never changed. */
export interface CalendarVersionWriter {
  /** @throws ConflictError when the calendar already has this version number. */
  create(version: CalendarVersion): Promise<void>;
}

/**
 * Checks that what an admin request names belongs to the signed-in owner, before any use case
 * runs. Someone else's calendar answers like one that does not exist, so ids cannot be probed.
 */
export interface CalendarOwnershipChecker {
  /** @throws NotFoundError when the calendar does not exist or is someone else's. */
  calendar(owner: AccountId, calendarId: CalendarId): Promise<Calendar>;
  /** A draft or published door. @throws NotFoundError likewise. */
  door(owner: AccountId, doorId: DoorId): Promise<Calendar>;
  /** @throws NotFoundError likewise. */
  member(owner: AccountId, memberId: MemberId): Promise<Calendar>;
  /** @throws NotFoundError likewise. */
  comment(owner: AccountId, commentId: CommentId): Promise<Calendar>;
}
