import type {
  CalendarDetails,
  CalendarId,
  CalendarReader,
  CalendarVersionReader,
  Door,
  DoorPreview,
  DoorReader,
  DraftDoorPresenter,
  DraftDoorReader,
  GetCalendarDetails,
  SubscriptionReader,
} from '@b-calendar/contracts';

export class GetCalendarDetailsUseCase implements GetCalendarDetails {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly drafts: DraftDoorReader,
    private readonly doors: DoorReader,
    private readonly versions: CalendarVersionReader,
    private readonly subscriptions: SubscriptionReader,
    private readonly presenter: DraftDoorPresenter,
  ) {}

  public async execute(input: { readonly calendarId: CalendarId }): Promise<CalendarDetails> {
    const calendar = await this.calendars.getById(input.calendarId);
    const [drafts, live, versions, subscriptions] = await Promise.all([
      this.drafts.listByCalendar(calendar.id),
      this.doors.listByCalendar(calendar.id),
      this.versions.listByCalendar(calendar.id),
      this.subscriptions.listByCalendar(calendar.id),
    ]);
    const doors = this.presenter.present(calendar, drafts, live);
    return {
      calendar,
      doors,
      unpublishedChanges: this.published(doors) !== this.published(live),
      versions: versions.map(({ version, publishedAt, doors: published }) => ({
        version,
        publishedAt,
        doorCount: published.length,
      })),
      subscriberCount: subscriptions.length,
    };
  }

  /** What the recipient gets of these doors, comparable as text. */
  private published(doors: readonly (Door | DoorPreview)[]): string {
    return JSON.stringify(
      doors.map(({ id, number, opensOn, openTime, opensAt, featured, content, notification }) => ({
        id,
        number,
        opensOn,
        openTime,
        opensAt,
        featured,
        content,
        notification,
      })),
    );
  }
}
