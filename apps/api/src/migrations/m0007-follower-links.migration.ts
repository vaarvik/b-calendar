import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/** A second link per calendar, for followers. Existing calendars get a fresh random key. */
export class M0007FollowerLinksMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('calendars').addColumn('follower_key', 'text').execute();
    await sql`
      UPDATE calendars
      SET follower_key = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
    `.execute(db);
    await db.schema
      .alterTable('calendars')
      .alterColumn('follower_key', (column) => column.setNotNull())
      .execute();
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('calendars').dropColumn('follower_key').execute();
  }
}
