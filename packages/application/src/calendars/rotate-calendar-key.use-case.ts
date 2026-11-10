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
    const calendar = {
      ...(await this.reader.getById(input.calendarId)),
      accessKey: this.secrets.generate(),
    };
    await this.writer.save(calendar);
    return calendar;
  }
}
