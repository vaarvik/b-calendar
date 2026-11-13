import type { DoorPreview, RecipientDoor } from '../doors/doors.model.js';
import type { CalendarId } from '../shared/shared.model.js';
import type {
  Calendar,
  CalendarAccess,
  CalendarLocale,
  CalendarRole,
  CalendarSettings,
  CalendarTheme,
  CalendarVersionSummary,
} from './calendars.model.js';

/** An admin creates a calendar. It gets a fresh access key. */
export interface CreateCalendar {
  /**
   * @throws ValidationError when the settings are invalid.
   * @throws ConflictError when the slug is taken.
   */
  execute(input: CalendarSettings): Promise<Calendar>;
}

export interface UpdateCalendarInput {
  readonly calendarId: CalendarId;
  readonly settings: CalendarSettings;
}

/**
 * An admin changes a calendar's settings. The access key stays. A new default time or time zone
 * moves the draft's doors without their own time; the recipient gets them with the next publish.
 */
export interface UpdateCalendar {
  /**
   * @throws ValidationError when the settings are invalid.
   * @throws NotFoundError when the calendar does not exist.
   * @throws ConflictError when the slug is taken.
   */
  execute(input: UpdateCalendarInput): Promise<Calendar>;
}

export interface RotateCalendarKeyInput {
  readonly calendarId: CalendarId;
  /** Her link or the followers' link; the other keeps working. */
  readonly role: CalendarRole;
}

/** A new key for one link, which signs out every device that used the old one. */
export interface RotateCalendarKey {
  /** @throws NotFoundError when the calendar does not exist. */
  execute(input: RotateCalendarKeyInput): Promise<Calendar>;
}

/** Every calendar, newest first. */
export interface ListCalendars {
  execute(): Promise<Calendar[]>;
}

/** A calendar with its draft in full, for the admin. */
export interface CalendarDetails {
  readonly calendar: Calendar;
  /** The draft's doors, in order, with the recipient's progress. */
  readonly doors: DoorPreview[];
  /** Whether publishing would change what the recipient has. */
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
 * An admin publishes the draft as the calendar's next version. The recipient's doors become the
 * draft's, numbered by date; her progress stays with each door, a door moved into the future
 * notifies again, and doors no longer in the draft leave her calendar.
 */
export interface PublishCalendar {
  /** @throws NotFoundError when the calendar does not exist. */
  execute(input: { readonly calendarId: CalendarId }): Promise<CalendarVersionSummary>;
}

/** The calendar as the recipient sees it: open doors with content, locked ones without. */
export interface RecipientCalendar {
  /** Whose link opened it: a follower's opens doors without recording them. */
  readonly role: CalendarRole;
  readonly slug: string;
  readonly title: string;
  readonly recipientName: string;
  readonly theme: CalendarTheme;
  readonly locale: CalendarLocale;
  /** Server time, so the app can count down without trusting the phone's clock. */
  readonly now: Date;
  readonly doors: RecipientDoor[];
}

/** The recipient opens her calendar. */
export interface ViewCalendar {
  /** @throws UnauthenticatedError when the slug or the key is wrong (the same error for both). */
  execute(input: CalendarAccess): Promise<RecipientCalendar>;
}
