import type {
  CalendarId,
  CalendarVersion,
  CalendarVersionReader,
  CalendarVersionWriter,
  DoorId,
} from '@b-calendar/contracts';
import type { Kysely } from 'kysely';
import { PublishedDoorRowsSchema } from './calendars.model.js';
import type { Database } from '../shared/shared.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

export class PgCalendarVersionRepository implements CalendarVersionReader, CalendarVersionWriter {
  public constructor(
    private readonly db: Kysely<Database>,
    private readonly errors: DatabaseErrorTranslator,
  ) {}

  public async listByCalendar(calendarId: CalendarId): Promise<CalendarVersion[]> {
    const rows = await this.db
      .selectFrom('calendar_versions')
      .selectAll()
      .where('calendar_id', '=', calendarId)
      .orderBy('version', 'desc')
      .execute();
    return rows.map((row) => ({
      calendarId: row.calendar_id as CalendarId,
      version: row.version,
      publishedAt: row.published_at,
      doors: PublishedDoorRowsSchema.parse(row.doors).map((door) => ({
        ...door,
        id: door.id as DoorId,
      })),
    }));
  }

  public async create(version: CalendarVersion): Promise<void> {
    try {
      await this.db
        .insertInto('calendar_versions')
        .values({
          calendar_id: version.calendarId,
          version: version.version,
          published_at: version.publishedAt,
          doors: JSON.stringify(version.doors),
        })
        .execute();
    } catch (error) {
      throw this.errors.translate(error);
    }
  }
}
