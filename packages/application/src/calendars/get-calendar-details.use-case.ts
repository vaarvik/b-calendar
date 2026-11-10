import type {
  CalendarDetails,
  CalendarId,
  CalendarReader,
  DoorPreviewPresenter,
  DoorReader,
  GetCalendarDetails,
  SubscriptionReader,
} from '@b-calendar/contracts';

export class GetCalendarDetailsUseCase implements GetCalendarDetails {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly doors: DoorReader,
    private readonly subscriptions: SubscriptionReader,
    private readonly previews: DoorPreviewPresenter,
  ) {}

  public async execute(input: { readonly calendarId: CalendarId }): Promise<CalendarDetails> {
    const calendar = await this.calendars.getById(input.calendarId);
    const [doors, subscriptions] = await Promise.all([
      this.doors.listByCalendar(calendar.id),
      this.subscriptions.listByCalendar(calendar.id),
    ]);
    return {
      calendar,
      doors: doors.map((door) => this.previews.preview(door)),
      subscriberCount: subscriptions.length,
    };
  }
}
