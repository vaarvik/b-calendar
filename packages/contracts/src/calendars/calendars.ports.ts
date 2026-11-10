import type { CalendarId } from '../shared/shared.model.js';
import type { Calendar, CalendarAccess } from './calendars.model.js';

/** Reads calendars. */
export interface CalendarReader {
  /** @throws NotFoundError when no calendar has this id. */
  getById(id: CalendarId): Promise<Calendar>;
  findBySlug(slug: string): Promise<Calendar | null>;
  /** Every calendar, newest first. */
  list(): Promise<Calendar[]>;
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

/** Checks a recipient's link. Shared by everything she does. */
export interface CalendarAccessAuthenticator {
  /**
   * @returns the calendar the slug and key open.
   * @throws UnauthenticatedError when the slug is unknown or the key is wrong (one error for both,
   * so a wrong guess does not tell which calendars exist).
   */
  authenticate(access: CalendarAccess): Promise<Calendar>;
}
