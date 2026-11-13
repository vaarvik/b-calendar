import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/**
 * The admin writes a draft and publishes it as numbered versions. Existing doors become both the
 * draft and version 1, so nothing changes for a recipient. Published door numbers are derived from
 * the date and renumbered on publish, so they are no longer unique.
 */
export class M0004DraftsAndVersionsMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .createTable('door_drafts')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('calendar_id', 'uuid', (column) =>
        column.notNull().references('calendars.id').onDelete('cascade'),
      )
      .addColumn('opens_on', 'text', (column) => column.notNull())
      .addColumn('added_at', 'timestamptz', (column) => column.notNull())
      .addColumn('draft', 'jsonb', (column) => column.notNull())
      .execute();
    await db.schema
      .createIndex('door_drafts_calendar_idx')
      .on('door_drafts')
      .columns(['calendar_id', 'opens_on', 'added_at'])
      .execute();
    await db.schema
      .createTable('calendar_versions')
      .addColumn('calendar_id', 'uuid', (column) =>
        column.notNull().references('calendars.id').onDelete('cascade'),
      )
      .addColumn('version', 'integer', (column) => column.notNull())
      .addColumn('published_at', 'timestamptz', (column) => column.notNull())
      .addColumn('doors', 'jsonb', (column) => column.notNull())
      .addPrimaryKeyConstraint('calendar_versions_pkey', ['calendar_id', 'version'])
      .execute();
    await db.schema.alterTable('doors').dropConstraint('doors_calendar_number_key').execute();

    const door = sql`jsonb_build_object(
      'opensOn', d.opens_on,
      'openTime', d.open_time,
      'featured', d.featured,
      'content', jsonb_build_object(
        'title', d.title,
        'message', d.message,
        'imageUrl', d.image_url,
        'linkUrl', d.link_url,
        'countdown', CASE WHEN d.countdown_to IS NULL THEN NULL ELSE jsonb_build_object(
          'to', to_char(d.countdown_to AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'label', coalesce(d.countdown_label, '')) END,
        'confetti', d.confetti),
      'notification', jsonb_build_object('title', d.notification_title, 'body', d.notification_body))`;
    await sql`
      INSERT INTO door_drafts (id, calendar_id, opens_on, added_at, draft)
      SELECT d.id, d.calendar_id, d.opens_on, d.opens_at, ${door}
      FROM doors d
    `.execute(db);
    await sql`
      INSERT INTO calendar_versions (calendar_id, version, published_at, doors)
      SELECT d.calendar_id, 1, now(), jsonb_agg(${door} || jsonb_build_object(
        'id', d.id,
        'number', d.number,
        'opensAt', to_char(d.opens_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
        ORDER BY d.number)
      FROM doors d
      GROUP BY d.calendar_id
    `.execute(db);
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('calendar_versions').execute();
    await db.schema.dropTable('door_drafts').execute();
    await db.schema
      .alterTable('doors')
      .addUniqueConstraint('doors_calendar_number_key', ['calendar_id', 'number'])
      .execute();
  }
}
