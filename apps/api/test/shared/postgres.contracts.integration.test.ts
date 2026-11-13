import {
  describeCalendarRepositoryContract,
  describeCalendarVersionRepositoryContract,
  describeDoorRepositoryContract,
  describeDraftDoorRepositoryContract,
  describeSubscriptionRepositoryContract,
} from '@b-calendar/contracts/test-kit';
import { NO_MIGRATIONS } from 'kysely/migration';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgCalendarVersionRepository } from '../../src/calendars/pg-calendar-version.repository.js';
import { PgCalendarRepository } from '../../src/calendars/pg-calendar.repository.js';
import { PgDoorRepository } from '../../src/doors/pg-door.repository.js';
import { PgDraftDoorRepository } from '../../src/doors/pg-draft-door.repository.js';
import { PgDatabaseErrorTranslator } from '../../src/shared/pg-database-error.translator.js';
import { PgSubscriptionRepository } from '../../src/subscriptions/pg-subscription.repository.js';
import { PostgresTestDatabase } from './postgres-test.database.js';

const database = new PostgresTestDatabase();
const errors = new PgDatabaseErrorTranslator();

beforeAll(() => database.start(), 300_000);
afterAll(() => database.stop());

async function fresh() {
  await database.reset();
  return new PgCalendarRepository(database.db, errors);
}

describeCalendarRepositoryContract('PgCalendarRepository', async () => {
  const calendars = await fresh();
  return { writer: calendars, reader: calendars };
});

describeDoorRepositoryContract('PgDoorRepository', async () => {
  const calendars = await fresh();
  const doors = new PgDoorRepository(database.db, errors);
  return { writer: doors, reader: doors, calendars };
});

describeDraftDoorRepositoryContract('PgDraftDoorRepository', async () => {
  const calendars = await fresh();
  const drafts = new PgDraftDoorRepository(database.db, errors);
  return { writer: drafts, reader: drafts, calendars };
});

describeCalendarVersionRepositoryContract('PgCalendarVersionRepository', async () => {
  const calendars = await fresh();
  const versions = new PgCalendarVersionRepository(database.db, errors);
  return { writer: versions, reader: versions, calendars };
});

describeSubscriptionRepositoryContract('PgSubscriptionRepository', async () => {
  const calendars = await fresh();
  const subscriptions = new PgSubscriptionRepository(database.db);
  return { writer: subscriptions, reader: subscriptions, calendars };
});

describe('migrations', () => {
  it('go all the way down and up again', async () => {
    const down = await database.migrator().migrateTo(NO_MIGRATIONS);
    expect(down.error).toBeUndefined();
    const up = await database.migrator().migrateToLatest();
    expect(up.error).toBeUndefined();
  });
});
