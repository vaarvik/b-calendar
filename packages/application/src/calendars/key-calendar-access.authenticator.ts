import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  CalendarAccess,
  CalendarAccessAuthenticator,
  CalendarReader,
  CalendarViewer,
  MemberReader,
  SecretMatcher,
} from '@b-calendar/contracts';

/** The slug finds the calendar; the key must be one member's or the followers'. */
export class KeyCalendarAccessAuthenticator implements CalendarAccessAuthenticator {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly members: MemberReader,
    private readonly matcher: SecretMatcher,
  ) {}

  public async authenticate(access: CalendarAccess): Promise<CalendarViewer> {
    const calendar = await this.calendars.findBySlug(access.slug);
    if (calendar !== null) {
      // Every key is compared, so the time taken does not tell which one was close.
      const matching = (await this.members.listByCalendar(calendar.id)).filter((member) =>
        this.matcher.matches(member.key, access.accessKey),
      );
      const follower = this.matcher.matches(calendar.followerKey, access.accessKey);
      const [member] = matching;
      if (member !== undefined) {
        return { kind: 'member', calendar, member };
      }
      if (follower) {
        return { kind: 'follower', calendar };
      }
    }
    throw new UnauthenticatedError('This link does not open a calendar.');
  }
}
