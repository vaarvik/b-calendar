import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  CalendarAccess,
  CalendarAccessAuthenticator,
  CalendarReader,
  CalendarViewer,
  SecretMatcher,
} from '@b-calendar/contracts';

/** The slug finds the calendar; the key must be hers (the access key) or the followers'. */
export class KeyCalendarAccessAuthenticator implements CalendarAccessAuthenticator {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly matcher: SecretMatcher,
  ) {}

  public async authenticate(access: CalendarAccess): Promise<CalendarViewer> {
    const calendar = await this.calendars.findBySlug(access.slug);
    if (calendar !== null) {
      // Both keys are compared, so the time taken does not tell which one was close.
      const hers = this.matcher.matches(calendar.accessKey, access.accessKey);
      const follower = this.matcher.matches(calendar.followerKey, access.accessKey);
      if (hers || follower) {
        return { calendar, role: hers ? 'recipient' : 'follower' };
      }
    }
    throw new UnauthenticatedError('This link does not open a calendar.');
  }
}
