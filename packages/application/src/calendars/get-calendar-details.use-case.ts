import type {
  CalendarDetails,
  CalendarId,
  CalendarReader,
  CalendarVersionReader,
  Door,
  DoorOpeningReader,
  DoorPreview,
  DoorReader,
  DraftDoorPresenter,
  DraftDoorReader,
  GetCalendarDetails,
  MemberReader,
  SubscriptionReader,
} from '@b-calendar/contracts';

export class GetCalendarDetailsUseCase implements GetCalendarDetails {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly drafts: DraftDoorReader,
    private readonly doors: DoorReader,
    private readonly members: MemberReader,
    private readonly openings: DoorOpeningReader,
    private readonly versions: CalendarVersionReader,
    private readonly subscriptions: SubscriptionReader,
    private readonly presenter: DraftDoorPresenter,
  ) {}

  public async execute(input: { readonly calendarId: CalendarId }): Promise<CalendarDetails> {
    const calendar = await this.calendars.getById(input.calendarId);
    const [drafts, live, members, openings, versions, subscriptions] = await Promise.all([
      this.drafts.listByCalendar(calendar.id),
      this.doors.listByCalendar(calendar.id),
      this.members.listByCalendar(calendar.id),
      this.openings.listByCalendar(calendar.id),
      this.versions.listByCalendar(calendar.id),
      this.subscriptions.listByCalendar(calendar.id),
    ]);
    const current = new Set(members.map((member) => member.id));
    const doors = this.presenter.present(calendar, drafts, {
      published: live,
      // A removed member's openings are not progress any more.
      openings: openings.filter((opening) => current.has(opening.memberId)),
    });
    return {
      calendar,
      doors,
      members,
      unpublishedChanges: this.published(doors) !== this.published(live),
      versions: versions.map(({ version, publishedAt, doors: published }) => ({
        version,
        publishedAt,
        doorCount: published.length,
      })),
      subscriberCount: subscriptions.length,
    };
  }

  /** What the members get of these doors, comparable as text. */
  private published(doors: readonly (Door | DoorPreview)[]): string {
    return JSON.stringify(
      doors.map(
        ({ id, number, opensOn, openTime, opensAt, featured, hidden, content, notification }) => ({
          id,
          number,
          opensOn,
          openTime,
          opensAt,
          featured,
          hidden,
          content,
          notification,
        }),
      ),
    );
  }
}
