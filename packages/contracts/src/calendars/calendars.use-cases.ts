import type { DoorPreview, RecipientDoor } from '../doors/doors.model.js';
import type { Member } from '../members/members.model.js';
import type { CalendarId, AccountId } from '../shared/shared.model.js';
import type {
  Calendar,
  CalendarAccess,
  CalendarLocale,
  CalendarSettings,
  CalendarTheme,
  CalendarViewerKind,
  CalendarVersionSummary,
} from './calendars.model.js';

export interface CreateCalendarInput {
  readonly owner: AccountId;
  readonly settings: CalendarSettings;
}

/** A signed-in owner creates a calendar, with a fresh follower key and no members yet. */
export interface CreateCalendar {
  /**
   * @throws ValidationError when the settings are invalid.
   * @throws ConflictError when the slug is taken.
   * @throws LimitExceededError when the owner has as many calendars as they may.
   */
  execute(input: CreateCalendarInput): Promise<Calendar>;
}

export interface UpdateCalendarInput {
  readonly calendarId: CalendarId;
  readonly settings: CalendarSettings;
}

/**
 * An admin changes a calendar's settings. Every link keeps working. A new default time or time zone
 * moves the draft's doors without their own time; the members get them with the next publish.
 */
export interface UpdateCalendar {
  /**
   * @throws ValidationError when the settings are invalid.
   * @throws NotFoundError when the calendar does not exist.
   * @throws ConflictError when the slug is taken.
   */
  execute(input: UpdateCalendarInput): Promise<Calendar>;
}

/**
 * A new key for the follower link, which signs out every device that used the old one. Members'
 * links keep working; each has its own key (RotateMemberKey).
 */
export interface RotateCalendarKey {
  /** @throws NotFoundError when the calendar does not exist. */
  execute(input: { readonly calendarId: CalendarId }): Promise<Calendar>;
}

/** The owner's calendars, newest first. */
export interface ListCalendars {
  execute(input: { readonly owner: AccountId }): Promise<Calendar[]>;
}

/** A calendar with its draft in full, for the admin. */
export interface CalendarDetails {
  readonly calendar: Calendar;
  /** The draft's doors, in order, with who has opened each. */
  readonly doors: DoorPreview[];
  /** By `addedAt`. */
  readonly members: Member[];
  /** Whether publishing would change what the members have. */
  readonly unpublishedChanges: boolean;
  /** Newest first. */
  readonly versions: CalendarVersionSummary[];
  /** Browsers that will get notifications. */
  readonly subscriberCount: number;
}

export interface GetCalendarDetails {
  /** @throws NotFoundError when the calendar does not exist. */
  execute(input: { readonly calendarId: CalendarId }): Promise<CalendarDetails>;
}

/**
 * An admin publishes the draft as the calendar's next version. The members' doors become the
 * draft's, numbered by date; who opened what stays with each door, a door moved into the future
 * notifies again, and doors no longer in the draft leave the calendar.
 */
export interface PublishCalendar {
  /** @throws NotFoundError when the calendar does not exist. */
  execute(input: { readonly calendarId: CalendarId }): Promise<CalendarVersionSummary>;
}

/**
 * The calendar as one link sees it: open doors with content, locked ones without. A member sees
 * the doors they opened as opened; a follower sees every door that has opened as ready.
 */
export interface RecipientCalendar {
  /** Whose link opened it: a follower's opens doors without recording them. */
  readonly viewer: CalendarViewerKind;
  /** The member's name, for the greeting; null on the follower link. */
  readonly name: string | null;
  readonly slug: string;
  readonly title: string;
  readonly theme: CalendarTheme;
  readonly locale: CalendarLocale;
  /** Server time, so the app can count down without trusting the phone's clock. */
  readonly now: Date;
  readonly doors: RecipientDoor[];
}

/** Someone opens the calendar with their link. */
export interface ViewCalendar {
  /** @throws UnauthenticatedError when the slug or the key is wrong (the same error for both). */
  execute(input: CalendarAccess): Promise<RecipientCalendar>;
}
