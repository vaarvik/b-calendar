import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/** Calendars, their doors and the browsers that get their notifications. */
export class M0001CalendarsMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .createTable('calendars')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('slug', 'text', (column) => column.notNull().unique())
      .addColumn('title', 'text', (column) => column.notNull())
      .addColumn('recipient_name', 'text', (column) => column.notNull())
      .addColumn('theme', 'text', (column) => column.notNull())
      .addColumn('locale', 'text', (column) => column.notNull())
      .addColumn('access_key', 'text', (column) => column.notNull())
      .addColumn('created_at', 'timestamptz', (column) => column.notNull())
      .execute();

    await db.schema
      .createTable('doors')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('calendar_id', 'uuid', (column) =>
        column.notNull().references('calendars.id').onDelete('cascade'),
      )
      .addColumn('number', 'integer', (column) => column.notNull())
      .addColumn('opens_at', 'timestamptz', (column) => column.notNull())
      .addColumn('title', 'text', (column) => column.notNull())
      .addColumn('message', 'text', (column) => column.notNull())
      .addColumn('image_url', 'text')
      .addColumn('link_url', 'text')
      .addColumn('countdown_to', 'timestamptz')
      .addColumn('countdown_label', 'text')
      .addColumn('confetti', 'boolean', (column) => column.notNull().defaultTo(false))
      .addColumn('notification_title', 'text', (column) => column.notNull())
      .addColumn('notification_body', 'text', (column) => column.notNull())
      .addColumn('notified_at', 'timestamptz')
      .addColumn('first_opened_at', 'timestamptz')
      .addUniqueConstraint('doors_calendar_number_key', ['calendar_id', 'number'])
      .execute();
    await sql`create index doors_unnotified_idx on doors (opens_at) where notified_at is null`.execute(
      db,
    );

    await db.schema
      .createTable('subscriptions')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('calendar_id', 'uuid', (column) =>
        column.notNull().references('calendars.id').onDelete('cascade'),
      )
      .addColumn('endpoint', 'text', (column) => column.notNull())
      .addColumn('p256dh', 'text', (column) => column.notNull())
      .addColumn('auth', 'text', (column) => column.notNull())
      .addColumn('created_at', 'timestamptz', (column) => column.notNull())
      .addUniqueConstraint('subscriptions_calendar_endpoint_key', ['calendar_id', 'endpoint'])
      .execute();
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('subscriptions').execute();
    await db.schema.dropTable('doors').execute();
    await db.schema.dropTable('calendars').execute();
  }
}
