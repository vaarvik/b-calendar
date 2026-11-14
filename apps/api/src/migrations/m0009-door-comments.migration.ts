import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/** Comments behind a door. They go with the door when a publish removes it. */
export class M0009DoorCommentsMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .createTable('door_comments')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('door_id', 'uuid', (column) =>
        column.notNull().references('doors.id').onDelete('cascade'),
      )
      .addColumn('author', 'text', (column) => column.notNull())
      .addColumn('role', 'text', (column) => column.notNull())
      .addColumn('text', 'text', (column) => column.notNull())
      .addColumn('created_at', 'timestamptz', (column) => column.notNull())
      .execute();
    await db.schema
      .createIndex('door_comments_door_idx')
      .on('door_comments')
      .columns(['door_id', 'created_at'])
      .execute();
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('door_comments').execute();
  }
}
