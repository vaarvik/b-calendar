export interface Migration {
  up(): Promise<void>;
}

export class M0001InitMigration implements Migration {
  public up(): Promise<void> {
    return Promise.resolve();
  }
}
