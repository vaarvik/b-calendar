import type {
  CalendarId,
  CalendarVersionReader,
  CalendarVersionSummary,
  CalendarVersionWriter,
  CalendarReader,
  Clock,
  Door,
  DoorReader,
  DoorWriter,
  DraftDoorPresenter,
  DraftDoorReader,
  PublishCalendar,
  PublishedDoor,
} from '@b-calendar/contracts';

export class PublishCalendarUseCase implements PublishCalendar {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly drafts: DraftDoorReader,
    private readonly doorReader: DoorReader,
    private readonly doorWriter: DoorWriter,
    private readonly versionReader: CalendarVersionReader,
    private readonly versionWriter: CalendarVersionWriter,
    private readonly presenter: DraftDoorPresenter,
    private readonly clock: Clock,
  ) {}

  public async execute(input: {
    readonly calendarId: CalendarId;
  }): Promise<CalendarVersionSummary> {
    const calendar = await this.calendars.getById(input.calendarId);
    const [drafts, live, versions] = await Promise.all([
      this.drafts.listByCalendar(calendar.id),
      this.doorReader.listByCalendar(calendar.id),
      this.versionReader.listByCalendar(calendar.id),
    ]);
    const now = this.clock.now();
    const liveById = new Map(live.map((door) => [door.id, door]));
    const doors: PublishedDoor[] = [];
    for (const preview of this.presenter.present(calendar, drafts, live)) {
      const { id, number, opensOn, openTime, opensAt, featured, hidden, content, notification } =
        preview;
      const door: PublishedDoor = {
        id,
        number,
        opensOn,
        openTime,
        opensAt,
        featured,
        hidden,
        content,
        notification,
      };
      const existing = liveById.get(door.id);
      const next: Door = {
        ...door,
        calendarId: calendar.id,
        // A door that opens later than now notifies (again) when it opens.
        notifiedAt: door.opensAt.getTime() > now.getTime() ? null : (existing?.notifiedAt ?? null),
        firstOpenedAt: existing?.firstOpenedAt ?? null,
      };
      if (existing === undefined) {
        await this.doorWriter.create(next);
      } else {
        await this.doorWriter.save(next);
        liveById.delete(door.id);
      }
      doors.push(door);
    }
    for (const dropped of liveById.keys()) {
      await this.doorWriter.remove(dropped);
    }
    const version = (versions[0]?.version ?? 0) + 1;
    await this.versionWriter.create({ calendarId: calendar.id, version, publishedAt: now, doors });
    return { version, publishedAt: now, doorCount: doors.length };
  }
}
