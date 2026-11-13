import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/** A door can show a second photo next to the first. */
export class M0008SecondPhotosMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('doors').addColumn('second_image_url', 'text').execute();
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('doors').dropColumn('second_image_url').execute();
  }
}
