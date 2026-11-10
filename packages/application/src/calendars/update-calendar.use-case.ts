import { CalendarSettingsSchema } from '@b-calendar/contracts';
import type {
  Calendar,
  CalendarReader,
  CalendarWriter,
  Clock,
  DoorReader,
  DoorScheduleCalculator,
  DoorWriter,
  InputValidator,
  UpdateCalendar,
  UpdateCalendarInput,
} from '@b-calendar/contracts';

export class UpdateCalendarUseCase implements UpdateCalendar {
  public constructor(
    private readonly reader: CalendarReader,
    private readonly writer: CalendarWriter,
    private readonly doorReader: DoorReader,
    private readonly doorWriter: DoorWriter,
    private readonly schedule: DoorScheduleCalculator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: UpdateCalendarInput): Promise<Calendar> {
    const settings = this.validator.validate(CalendarSettingsSchema, input.settings);
    const calendar = { ...(await this.reader.getById(input.calendarId)), ...settings };
    await this.writer.save(calendar);
    await this.moveDoorsOnDefaultTime(calendar);
    return calendar;
  }

  private async moveDoorsOnDefaultTime(calendar: Calendar): Promise<void> {
    const now = this.clock.now().getTime();
    for (const door of await this.doorReader.listByCalendar(calendar.id)) {
      if (door.openTime !== null) {
        continue;
      }
      const opensAt = this.schedule.opensAt(
        door.opensOn,
        calendar.defaultOpenTime,
        calendar.timeZone,
      );
      if (opensAt.getTime() === door.opensAt.getTime()) {
        continue;
      }
      await this.doorWriter.save({
        ...door,
        opensAt,
        notifiedAt: opensAt.getTime() > now ? null : door.notifiedAt,
      });
    }
  }
}
