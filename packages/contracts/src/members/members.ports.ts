import type { CalendarId, MemberId } from '../shared/shared.model.js';
import type { Member } from './members.model.js';

/** Reads the people sharing calendars. */
export interface MemberReader {
  /** @throws NotFoundError when no member has this id. */
  getById(id: MemberId): Promise<Member>;
  /** The calendar's members, by `addedAt`; `[]` when there are none. */
  listByCalendar(calendarId: CalendarId): Promise<Member[]>;
}

/** Stores the people sharing calendars. */
export interface MemberWriter {
  /** @throws ConflictError when the id is taken. */
  create(member: Member): Promise<void>;
  /**
   * Replaces a member (a new name, a new key).
   *
   * @throws NotFoundError when no member has this id.
   */
  save(member: Member): Promise<void>;
  /**
   * Removes a member: their key opens nothing any more. Their comments stay, under their name.
   *
   * @throws NotFoundError when no member has this id.
   */
  remove(id: MemberId): Promise<void>;
}
