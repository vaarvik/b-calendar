import { CALENDAR_LOCALES, CALENDAR_THEMES, NotFoundError } from '@b-calendar/contracts';
import type { Calendar, CalendarId, CalendarReader, CalendarWriter } from '@b-calendar/contracts';
import type { Kysely, Selectable } from 'kysely';
import { z } from 'zod';
import type { CalendarsTable, Database } from '../shared/shared.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

const RowSchema = z.object({
  theme: z.enum(CALENDAR_THEMES),
  locale: z.enum(CALENDAR_LOCALES),
});

export class PgCalendarRepository implements CalendarReader, CalendarWriter {
  public constructor(
    private readonly db: Kysely<Database>,
    private readonly errors: DatabaseErrorTranslator,
  ) {}

  public async getById(id: CalendarId): Promise<Calendar> {
    const row = await this.db
      .selectFrom('calendars')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (row === undefined) {
      throw new NotFoundError('Calendar', id);
    }
    return this.toCalendar(row);
  }

  public async findBySlug(slug: string): Promise<Calendar | null> {
    const row = await this.db
      .selectFrom('calendars')
      .selectAll()
      .where('slug', '=', slug)
      .executeTakeFirst();
    return row === undefined ? null : this.toCalendar(row);
  }

  public async list(): Promise<Calendar[]> {
    const rows = await this.db
      .selectFrom('calendars')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
    return rows.map((row) => this.toCalendar(row));
  }

  public async create(calendar: Calendar): Promise<void> {
    try {
      await this.db.insertInto('calendars').values(this.toRow(calendar)).execute();
    } catch (error) {
      throw this.errors.translate(error);
    }
  }

  public async save(calendar: Calendar): Promise<void> {
    let updated: bigint;
    try {
      const result = await this.db
        .updateTable('calendars')
        .set(this.toRow(calendar))
        .where('id', '=', calendar.id)
        .executeTakeFirst();
      updated = result.numUpdatedRows;
    } catch (error) {
      throw this.errors.translate(error);
    }
    if (updated === 0n) {
      throw new NotFoundError('Calendar', calendar.id);
    }
  }

  private toRow(calendar: Calendar): CalendarsTable {
    return {
      id: calendar.id,
      slug: calendar.slug,
      title: calendar.title,
      recipient_name: calendar.recipientName,
      theme: calendar.theme,
      locale: calendar.locale,
      time_zone: calendar.timeZone,
      default_open_time: calendar.defaultOpenTime,
      access_key: calendar.accessKey,
      created_at: calendar.createdAt,
    };
  }

  private toCalendar(row: Selectable<CalendarsTable>): Calendar {
    const { theme, locale } = RowSchema.parse(row);
    return {
      id: row.id as CalendarId,
      slug: row.slug,
      title: row.title,
      recipientName: row.recipient_name,
      theme,
      locale,
      timeZone: row.time_zone,
      defaultOpenTime: row.default_open_time,
      accessKey: row.access_key,
      createdAt: row.created_at,
    };
  }
}
