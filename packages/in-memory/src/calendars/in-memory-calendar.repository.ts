import { ConflictError, NotFoundError } from '@b-calendar/contracts';
import type { Calendar, CalendarId, CalendarReader, CalendarWriter } from '@b-calendar/contracts';

/** Calendars in a map. Copies on the way in and out, like a database would. */
export class InMemoryCalendarRepository implements CalendarReader, CalendarWriter {
  private readonly rows = new Map<CalendarId, Calendar>();

  public getById(id: CalendarId): Promise<Calendar> {
    const row = this.rows.get(id);
    return row === undefined
      ? Promise.reject(new NotFoundError('Calendar', id))
      : Promise.resolve(structuredClone(row));
  }

  public findBySlug(slug: string): Promise<Calendar | null> {
    const row = [...this.rows.values()].find((calendar) => calendar.slug === slug);
    return Promise.resolve(row === undefined ? null : structuredClone(row));
  }

  public list(): Promise<Calendar[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => structuredClone(row)),
    );
  }

  public create(calendar: Calendar): Promise<void> {
    if (this.rows.has(calendar.id) || this.slugTaken(calendar)) {
      return Promise.reject(new ConflictError(`Calendar ${calendar.slug} exists.`));
    }
    this.rows.set(calendar.id, structuredClone(calendar));
    return Promise.resolve();
  }

  public save(calendar: Calendar): Promise<void> {
    if (!this.rows.has(calendar.id)) {
      return Promise.reject(new NotFoundError('Calendar', calendar.id));
    }
    if (this.slugTaken(calendar)) {
      return Promise.reject(new ConflictError(`The slug ${calendar.slug} is taken.`));
    }
    this.rows.set(calendar.id, structuredClone(calendar));
    return Promise.resolve();
  }

  private slugTaken(calendar: Calendar): boolean {
    return [...this.rows.values()].some(
      (row) => row.slug === calendar.slug && row.id !== calendar.id,
    );
  }
}
