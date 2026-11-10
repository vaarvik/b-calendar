import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  Calendar,
  CalendarAccess,
  CalendarAccessAuthenticator,
  CalendarReader,
  SecretMatcher,
} from '@b-calendar/contracts';

/** The slug finds the calendar; the key must match its access key. */
export class KeyCalendarAccessAuthenticator implements CalendarAccessAuthenticator {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly matcher: SecretMatcher,
  ) {}

  public async authenticate(access: CalendarAccess): Promise<Calendar> {
    const calendar = await this.calendars.findBySlug(access.slug);
    if (calendar === null || !this.matcher.matches(calendar.accessKey, access.accessKey)) {
      throw new UnauthenticatedError('This link does not open a calendar.');
    }
    return calendar;
  }
}
