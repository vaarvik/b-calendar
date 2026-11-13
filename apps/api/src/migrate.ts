import { NO_MIGRATIONS } from 'kysely/migration';
import type { MigrationResultSet } from 'kysely/migration';
import { CompositionRoot } from './composition-root.js';

// Usage: migrate [latest | down | reset]. `down` reverts one migration, `reset` reverts all.
const command = process.argv[2] ?? 'latest';
// The image migrates before it serves; with STORAGE=memory there is nothing to migrate.
if (CompositionRoot.configFromEnv(process.env).storage === 'memory') {
  console.log('Nothing to migrate: STORAGE=memory.');
  process.exit(0);
}
const root = CompositionRoot.fromEnv(process.env);
const migrator = root.migrator();

const commands: Record<string, () => Promise<MigrationResultSet>> = {
  latest: () => migrator.migrateToLatest(),
  down: () => migrator.migrateDown(),
  reset: () => migrator.migrateTo(NO_MIGRATIONS),
};

const run = commands[command];
if (run === undefined) {
  console.error(`Unknown command "${command}". Use latest, down or reset.`);
  process.exitCode = 2;
} else {
  const { error, results = [] } = await run();
  for (const result of results) {
    console.log(`${result.status.padEnd(8)} ${result.direction.padEnd(4)} ${result.migrationName}`);
  }
  if (results.length === 0 && error === undefined) {
    console.log('Nothing to do.');
  }
  if (error !== undefined) {
    console.error(error);
    process.exitCode = 1;
  }
}
await root.close();
