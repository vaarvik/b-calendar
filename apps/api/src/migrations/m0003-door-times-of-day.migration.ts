import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/**
 * Doors open on a day at the calendar's default time of day, or at their own. Existing calendars
 * get Europe/Oslo and 08:00; existing doors keep their exact instant, with their own time where it
 * is not 08:00.
 */
export class M0003DoorTimesOfDayMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .alterTable('calendars')
      .addColumn('time_zone', 'text', (column) => column.notNull().defaultTo('Europe/Oslo'))
      .addColumn('default_open_time', 'text', (column) => column.notNull().defaultTo('08:00'))
      .execute();
    await db.schema
      .alterTable('doors')
      .addColumn('opens_on', 'text')
      .addColumn('open_time', 'text')
      .execute();
    await sql`
      UPDATE doors d
      SET opens_on = to_char(d.opens_at AT TIME ZONE c.time_zone, 'YYYY-MM-DD'),
          open_time = NULLIF(to_char(d.opens_at AT TIME ZONE c.time_zone, 'HH24:MI'), c.default_open_time)
      FROM calendars c
      WHERE c.id = d.calendar_id
    `.execute(db);
    await db.schema
      .alterTable('doors')
      .alterColumn('opens_on', (column) => column.setNotNull())
      .execute();
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('doors').dropColumn('opens_on').dropColumn('open_time').execute();
    await db.schema
      .alterTable('calendars')
      .dropColumn('time_zone')
      .dropColumn('default_open_time')
      .execute();
  }
}
