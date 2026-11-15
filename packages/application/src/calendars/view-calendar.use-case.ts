import type {
  CalendarAccess,
  CalendarAccessAuthenticator,
  Clock,
  DoorOpeningReader,
  DoorReader,
  RecipientCalendar,
  RecipientDoorPresenter,
  ViewCalendar,
} from '@b-calendar/contracts';

export class ViewCalendarUseCase implements ViewCalendar {
  public constructor(
    private readonly access: CalendarAccessAuthenticator,
    private readonly doors: DoorReader,
    private readonly openings: DoorOpeningReader,
    private readonly presenter: RecipientDoorPresenter,
    private readonly clock: Clock,
  ) {}

  public async execute(input: CalendarAccess): Promise<RecipientCalendar> {
    const viewer = await this.access.authenticate(input);
    const { calendar } = viewer;
    const now = this.clock.now();
    const [doors, openings] = await Promise.all([
      this.doors.listByCalendar(calendar.id),
      viewer.kind === 'member' ? this.openings.listByMember(viewer.member.id) : [],
    ]);
    const openedAt = new Map(openings.map((opening) => [opening.doorId, opening.openedAt]));
    return {
      viewer: viewer.kind,
      name: viewer.kind === 'member' ? viewer.member.name : null,
      slug: calendar.slug,
      title: calendar.title,
      theme: calendar.theme,
      locale: calendar.locale,
      now,
      doors: doors.flatMap(
        (door) => this.presenter.present(door, now, openedAt.get(door.id) ?? null) ?? [],
      ),
    };
  }
}
