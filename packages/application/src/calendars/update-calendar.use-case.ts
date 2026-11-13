import { CalendarSettingsSchema } from '@b-calendar/contracts';
import type {
  Calendar,
  CalendarReader,
  CalendarWriter,
  InputValidator,
  UpdateCalendar,
  UpdateCalendarInput,
} from '@b-calendar/contracts';

/** Draft doors take their time from the calendar when shown; published ones move on publish. */
export class UpdateCalendarUseCase implements UpdateCalendar {
  public constructor(
    private readonly reader: CalendarReader,
    private readonly writer: CalendarWriter,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: UpdateCalendarInput): Promise<Calendar> {
    const settings = this.validator.validate(CalendarSettingsSchema, input.settings);
    const calendar = { ...(await this.reader.getById(input.calendarId)), ...settings };
    await this.writer.save(calendar);
    return calendar;
  }
}
