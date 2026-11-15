import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/**
 * Accounts that sign in with SSO and own calendars. Existing calendars and uploads get no owner
 * (null) until their owner signs in and claims them; nothing else about them changes.
 */
export class M0011AccountsMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .createTable('accounts')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('name', 'text', (column) => column.notNull())
      .addColumn('email', 'text')
      .addColumn('created_at', 'timestamptz', (column) => column.notNull())
      .execute();
    await db.schema
      .createTable('account_identities')
      .addColumn('provider', 'text', (column) => column.notNull())
      .addColumn('subject', 'text', (column) => column.notNull())
      .addColumn('account_id', 'uuid', (column) =>
        column.notNull().references('accounts.id').onDelete('cascade'),
      )
      .addPrimaryKeyConstraint('account_identities_pk', ['provider', 'subject'])
      .execute();
    await db.schema
      .createIndex('account_identities_account_idx')
      .on('account_identities')
      .column('account_id')
      .execute();
    await db.schema
      .alterTable('calendars')
      .addColumn('owner_id', 'uuid', (column) => column.references('accounts.id'))
      .execute();
    await db.schema
      .createIndex('calendars_owner_idx')
      .on('calendars')
      .columns(['owner_id', 'created_at'])
      .execute();
    await db.schema
      .createTable('media_files')
      .addColumn('id', 'uuid', (column) => column.primaryKey())
      .addColumn('owner_id', 'uuid', (column) => column.references('accounts.id'))
      .addColumn('content_type', 'text', (column) => column.notNull())
      .addColumn('bytes', 'bigint', (column) => column.notNull())
      .addColumn('created_at', 'timestamptz', (column) => column.notNull())
      .execute();
    await db.schema
      .createIndex('media_files_owner_idx')
      .on('media_files')
      .columns(['owner_id', 'created_at'])
      .execute();
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.dropTable('media_files').execute();
    await db.schema.alterTable('calendars').dropColumn('owner_id').execute();
    await db.schema.dropTable('account_identities').execute();
    await db.schema.dropTable('accounts').execute();
  }
}
