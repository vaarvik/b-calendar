import type { Calendar, CalendarReader, ListCalendars } from '@b-calendar/contracts';

export class ListCalendarsUseCase implements ListCalendars {
  public constructor(private readonly calendars: CalendarReader) {}

  public execute(): Promise<Calendar[]> {
    return this.calendars.list();
  }
}
