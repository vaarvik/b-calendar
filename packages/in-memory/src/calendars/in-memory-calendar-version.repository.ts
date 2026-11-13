import { ConflictError } from '@b-calendar/contracts';
import type {
  CalendarId,
  CalendarVersion,
  CalendarVersionReader,
  CalendarVersionWriter,
} from '@b-calendar/contracts';

/** Published versions in a list. Copies on the way in and out, like a database would. */
export class InMemoryCalendarVersionRepository
  implements CalendarVersionReader, CalendarVersionWriter
{
  private readonly rows: CalendarVersion[] = [];

  public listByCalendar(calendarId: CalendarId): Promise<CalendarVersion[]> {
    return Promise.resolve(
      this.rows
        .filter((row) => row.calendarId === calendarId)
        .map((row) => structuredClone(row))
        .sort((a, b) => b.version - a.version),
    );
  }

  public create(version: CalendarVersion): Promise<void> {
    if (
      this.rows.some(
        (row) => row.calendarId === version.calendarId && row.version === version.version,
      )
    ) {
      return Promise.reject(new ConflictError(`Version ${String(version.version)} exists.`));
    }
    this.rows.push(structuredClone(version));
    return Promise.resolve();
  }
}
