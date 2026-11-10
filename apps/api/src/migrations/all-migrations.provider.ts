import type { Migration, MigrationProvider } from 'kysely/migration';
import { M0001CalendarsMigration } from './m0001-calendars.migration.js';
import { M0002FeaturedDoorsMigration } from './m0002-featured-doors.migration.js';

/**
 * Every migration, keyed so that string order is execution order. Add new ones at the end.
 * Kysely copies migration objects with spread, which drops class methods, so each class is
 * handed over as a plain `{ up, down }` object bound to its instance.
 */
export class AllMigrationsProvider implements MigrationProvider {
  public getMigrations(): Promise<Record<string, Migration>> {
    const migrations: Record<string, Required<Migration>> = {
      '0001_calendars': new M0001CalendarsMigration(),
      '0002_featured_doors': new M0002FeaturedDoorsMigration(),
    };
    return Promise.resolve(
      Object.fromEntries(
        Object.entries(migrations).map(([name, migration]) => [
          name,
          { up: (db) => migration.up(db), down: (db) => migration.down(db) } satisfies Migration,
        ]),
      ),
    );
  }
}
