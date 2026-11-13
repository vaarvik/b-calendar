import type {
  CalendarAccess,
  CalendarAccessAuthenticator,
  Clock,
  DoorReader,
  RecipientCalendar,
  RecipientDoorPresenter,
  ViewCalendar,
} from '@b-calendar/contracts';

export class ViewCalendarUseCase implements ViewCalendar {
  public constructor(
    private readonly access: CalendarAccessAuthenticator,
    private readonly doors: DoorReader,
    private readonly presenter: RecipientDoorPresenter,
    private readonly clock: Clock,
  ) {}

  public async execute(input: CalendarAccess): Promise<RecipientCalendar> {
    const { calendar, role } = await this.access.authenticate(input);
    const now = this.clock.now();
    const doors = await this.doors.listByCalendar(calendar.id);
    return {
      role,
      slug: calendar.slug,
      title: calendar.title,
      recipientName: calendar.recipientName,
      theme: calendar.theme,
      locale: calendar.locale,
      now,
      doors: doors.flatMap((door) => this.presenter.present(door, now) ?? []),
    };
  }
}
