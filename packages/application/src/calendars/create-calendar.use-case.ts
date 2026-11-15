import { CalendarSettingsSchema, LimitExceededError } from '@b-calendar/contracts';
import type {
  AccountLimits,
  Calendar,
  CalendarReader,
  CalendarWriter,
  CreateCalendarInput,
  Clock,
  CreateCalendar,
  IdGenerator,
  InputValidator,
  SecretGenerator,
} from '@b-calendar/contracts';

export class CreateCalendarUseCase implements CreateCalendar {
  public constructor(
    private readonly reader: CalendarReader,
    private readonly calendars: CalendarWriter,
    private readonly ids: IdGenerator,
    private readonly secrets: SecretGenerator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
    private readonly limits: AccountLimits,
  ) {}

  public async execute(input: CreateCalendarInput): Promise<Calendar> {
    const settings = this.validator.validate(CalendarSettingsSchema, input.settings);
    if ((await this.reader.listByOwner(input.owner)).length >= this.limits.calendars) {
      throw new LimitExceededError('calendars', this.limits.calendars);
    }
    const calendar: Calendar = {
      ...settings,
      id: this.ids.calendarId(),
      ownerId: input.owner,
      followerKey: this.secrets.generate(),
      createdAt: this.clock.now(),
    };
    await this.calendars.create(calendar);
    return calendar;
  }
}
