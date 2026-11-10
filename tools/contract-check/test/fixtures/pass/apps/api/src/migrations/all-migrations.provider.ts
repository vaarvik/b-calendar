import { M0001InitMigration } from './m0001-init.migration.js';
import type { Migration, MigrationProvider } from './migrations.ports.js';

export class AllMigrationsProvider implements MigrationProvider {
  public migrations(): readonly Migration[] {
    return [new M0001InitMigration()];
  }
}
