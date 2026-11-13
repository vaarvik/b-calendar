import type {
  Calendar,
  CalendarReader,
  CalendarWriter,
  RotateCalendarKey,
  RotateCalendarKeyInput,
  SecretGenerator,
} from '@b-calendar/contracts';

export class RotateCalendarKeyUseCase implements RotateCalendarKey {
  public constructor(
    private readonly reader: CalendarReader,
    private readonly writer: CalendarWriter,
    private readonly secrets: SecretGenerator,
  ) {}

  public async execute(input: RotateCalendarKeyInput): Promise<Calendar> {
    const current = await this.reader.getById(input.calendarId);
    const calendar =
      input.role === 'recipient'
        ? { ...current, accessKey: this.secrets.generate() }
        : { ...current, followerKey: this.secrets.generate() };
    await this.writer.save(calendar);
    return calendar;
  }
}
