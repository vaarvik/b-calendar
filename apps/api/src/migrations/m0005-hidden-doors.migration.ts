import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/** A secret door is not shown to the recipient until it opens. Existing doors are not secret. */
export class M0005HiddenDoorsMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .alterTable('doors')
      .addColumn('hidden', 'boolean', (column) => column.notNull().defaultTo(false))
      .execute();
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('doors').dropColumn('hidden').execute();
  }
}
