import type {
  Calendar,
  CalendarId,
  CalendarReader,
  CalendarWriter,
  RotateCalendarKey,
  SecretGenerator,
} from '@b-calendar/contracts';

export class RotateCalendarKeyUseCase implements RotateCalendarKey {
  public constructor(
    private readonly reader: CalendarReader,
    private readonly writer: CalendarWriter,
    private readonly secrets: SecretGenerator,
  ) {}

  public async execute(input: { readonly calendarId: CalendarId }): Promise<Calendar> {
    const current = await this.reader.getById(input.calendarId);
    const calendar = { ...current, followerKey: this.secrets.generate() };
    await this.writer.save(calendar);
    return calendar;
  }
}
