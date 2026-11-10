import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Migrator } from 'kysely/migration';
import pg from 'pg';
import { AllMigrationsProvider } from '../../src/migrations/all-migrations.provider.js';
import type { Database } from '../../src/shared/shared.model.js';

/** Must match docker-compose.yml. */
export const POSTGRES_IMAGE = 'postgres:16-alpine';

/** A throwaway Postgres container, migrated to the latest schema. One per test file. */
export class PostgresTestDatabase {
  private container: StartedPostgreSqlContainer | undefined;
  private kysely: Kysely<Database> | undefined;

  public get db(): Kysely<Database> {
    if (this.kysely === undefined) {
      throw new Error('PostgresTestDatabase used before start().');
    }
    return this.kysely;
  }

  public migrator(): Migrator {
    return new Migrator({ db: this.db, provider: new AllMigrationsProvider() });
  }

  public async start(): Promise<void> {
    this.container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
    this.kysely = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new pg.Pool({ connectionString: this.container.getConnectionUri(), max: 10 }),
      }),
    });
    const { error } = await this.migrator().migrateToLatest();
    if (error !== undefined) {
      throw error instanceof Error ? error : new Error('Migration failed.', { cause: error });
    }
  }

  /** Empties every table. */
  public async reset(): Promise<void> {
    await sql`TRUNCATE calendars, doors, subscriptions CASCADE`.execute(this.db);
  }

  public async stop(): Promise<void> {
    await this.kysely?.destroy();
    await this.container?.stop();
  }
}
