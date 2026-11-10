import type { DoorPreview, RecipientDoor } from '../doors/doors.model.js';
import type { CalendarId } from '../shared/shared.model.js';
import type {
  Calendar,
  CalendarAccess,
  CalendarLocale,
  CalendarSettings,
  CalendarTheme,
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
 * moves every door without its own time; a door moved into the future notifies again.
 */
export interface UpdateCalendar {
  /**
   * @throws ValidationError when the settings are invalid.
   * @throws NotFoundError when the calendar does not exist.
   * @throws ConflictError when the slug is taken.
   */
  execute(input: UpdateCalendarInput): Promise<Calendar>;
}

/** A new access key, which signs out every device that used the old link. */
export interface RotateCalendarKey {
  /** @throws NotFoundError when the calendar does not exist. */
  execute(input: { readonly calendarId: CalendarId }): Promise<Calendar>;
}

/** Every calendar, newest first. */
export interface ListCalendars {
  execute(): Promise<Calendar[]>;
}

/** A calendar with every door in full, for the admin. */
export interface CalendarDetails {
  readonly calendar: Calendar;
  readonly doors: DoorPreview[];
  /** Browsers that will get notifications. */
  readonly subscriberCount: number;
}

export interface GetCalendarDetails {
  /** @throws NotFoundError when the calendar does not exist. */
  execute(input: { readonly calendarId: CalendarId }): Promise<CalendarDetails>;
}

/** The calendar as the recipient sees it: open doors with content, locked ones without. */
export interface RecipientCalendar {
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
