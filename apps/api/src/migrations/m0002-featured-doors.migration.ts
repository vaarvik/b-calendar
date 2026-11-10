import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/** Special hatches (the birthday, the last day) that look grander. */
export class M0002FeaturedDoorsMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .alterTable('doors')
      .addColumn('featured', 'boolean', (column) => column.notNull().defaultTo(false))
      .execute();
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('doors').dropColumn('featured').execute();
  }
}
