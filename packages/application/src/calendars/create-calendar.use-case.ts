import { CalendarSettingsSchema } from '@b-calendar/contracts';
import type {
  Calendar,
  CalendarSettings,
  CalendarWriter,
  Clock,
  CreateCalendar,
  IdGenerator,
  InputValidator,
  SecretGenerator,
} from '@b-calendar/contracts';

export class CreateCalendarUseCase implements CreateCalendar {
  public constructor(
    private readonly calendars: CalendarWriter,
    private readonly ids: IdGenerator,
    private readonly secrets: SecretGenerator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: CalendarSettings): Promise<Calendar> {
    const settings = this.validator.validate(CalendarSettingsSchema, input);
    const calendar: Calendar = {
      ...settings,
      id: this.ids.calendarId(),
      accessKey: this.secrets.generate(),
      followerKey: this.secrets.generate(),
      createdAt: this.clock.now(),
    };
    await this.calendars.create(calendar);
    return calendar;
  }
}
