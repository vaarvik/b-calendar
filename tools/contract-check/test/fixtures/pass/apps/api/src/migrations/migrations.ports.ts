export interface Migration {
  up(): Promise<void>;
}

export interface MigrationProvider {
  migrations(): readonly Migration[];
}
