import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/**
 * Calendars shared by members, each with their own link and their own opened doors. Every
 * existing calendar's recipient becomes its first member, with her name and her very key, so her
 * link and her Home Screen app keep working; the doors she opened become her openings and her
 * comments become hers as a member.
 */
export class M0010MembersMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .createTable('members')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('calendar_id', 'uuid', (column) =>
        column.notNull().references('calendars.id').onDelete('cascade'),
      )
      .addColumn('name', 'text', (column) => column.notNull())
      .addColumn('key', 'text', (column) => column.notNull())
      .addColumn('added_at', 'timestamptz', (column) => column.notNull())
      .execute();
    await db.schema
      .createIndex('members_calendar_idx')
      .on('members')
      .columns(['calendar_id', 'added_at'])
      .execute();
    await sql`
      INSERT INTO members (id, calendar_id, name, key, added_at)
      SELECT gen_random_uuid(), id, recipient_name, access_key, created_at FROM calendars
    `.execute(db);

    await db.schema
      .createTable('door_openings')
      .addColumn('door_id', 'uuid', (column) =>
        column.notNull().references('doors.id').onDelete('cascade'),
      )
      .addColumn('member_id', 'uuid', (column) =>
        column.notNull().references('members.id').onDelete('cascade'),
      )
      .addColumn('opened_at', 'timestamptz', (column) => column.notNull())
      .addPrimaryKeyConstraint('door_openings_pk', ['door_id', 'member_id'])
      .execute();
    await db.schema
      .createIndex('door_openings_member_idx')
      .on('door_openings')
      .columns(['member_id', 'opened_at'])
      .execute();
    // Each calendar has exactly one member at this point: the recipient.
    await sql`
      INSERT INTO door_openings (door_id, member_id, opened_at)
      SELECT doors.id, members.id, doors.first_opened_at
      FROM doors JOIN members ON members.calendar_id = doors.calendar_id
      WHERE doors.first_opened_at IS NOT NULL
    `.execute(db);

    await db.schema
      .alterTable('door_comments')
      .addColumn('member_id', 'uuid', (column) =>
        column.references('members.id').onDelete('set null'),
      )
      .execute();
    await sql`
      UPDATE door_comments
      SET role = 'member', member_id = members.id
      FROM doors JOIN members ON members.calendar_id = doors.calendar_id
      WHERE door_comments.door_id = doors.id AND door_comments.role = 'recipient'
    `.execute(db);

    await db.schema
      .alterTable('subscriptions')
      .addColumn('member_id', 'uuid', (column) =>
        column.references('members.id').onDelete('cascade'),
      )
      .execute();

    await db.schema.alterTable('doors').dropColumn('first_opened_at').execute();
    await db.schema.alterTable('calendars').dropColumn('access_key').execute();
    await db.schema.alterTable('calendars').dropColumn('recipient_name').execute();
  }

  /** Back to one recipient per calendar: its first member (or a fresh key when it has none). */
  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('calendars').addColumn('recipient_name', 'text').execute();
    await db.schema.alterTable('calendars').addColumn('access_key', 'text').execute();
    await sql`
      UPDATE calendars SET
        recipient_name = coalesce(
          (SELECT name FROM members WHERE calendar_id = calendars.id
            ORDER BY added_at, id LIMIT 1),
          'Mottaker'
        ),
        access_key = coalesce(
          (SELECT key FROM members WHERE calendar_id = calendars.id
            ORDER BY added_at, id LIMIT 1),
          replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
        )
    `.execute(db);
    await db.schema
      .alterTable('calendars')
      .alterColumn('recipient_name', (column) => column.setNotNull())
      .execute();
    await db.schema
      .alterTable('calendars')
      .alterColumn('access_key', (column) => column.setNotNull())
      .execute();

    await db.schema.alterTable('doors').addColumn('first_opened_at', 'timestamptz').execute();
    // The recipient again is the first member: her openings go back on the doors.
    await sql`
      UPDATE doors SET first_opened_at = door_openings.opened_at
      FROM door_openings
      JOIN members ON members.id = door_openings.member_id
      JOIN calendars ON calendars.id = members.calendar_id
      WHERE door_openings.door_id = doors.id AND members.key = calendars.access_key
    `.execute(db);

    await sql`UPDATE door_comments SET role = 'recipient' WHERE role = 'member'`.execute(db);
    await db.schema.alterTable('door_comments').dropColumn('member_id').execute();
    await db.schema.alterTable('subscriptions').dropColumn('member_id').execute();
    await db.schema.dropTable('door_openings').execute();
    await db.schema.dropTable('members').execute();
  }
}
