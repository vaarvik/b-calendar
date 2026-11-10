import type { Migration } from './migrations.ports.js';

export class M0001InitMigration implements Migration {
  public up(): Promise<void> {
    return Promise.resolve();
  }
}
