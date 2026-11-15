import type { Calendar, AccountId, CalendarReader, ListCalendars } from '@b-calendar/contracts';

export class ListCalendarsUseCase implements ListCalendars {
  public constructor(private readonly calendars: CalendarReader) {}

  public execute(input: { readonly owner: AccountId }): Promise<Calendar[]> {
    return this.calendars.listByOwner(input.owner);
  }
}
