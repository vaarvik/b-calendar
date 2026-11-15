import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresTestDatabase } from '../shared/postgres-test.database.js';

const database = new PostgresTestDatabase();

beforeAll(() => database.start(), 300_000);
afterAll(() => database.stop());

const CALENDAR = '11111111-1111-4111-8111-111111111111';
const EMPTY = '22222222-2222-4222-8222-222222222222';
const OPENED = '33333333-3333-4333-8333-333333333333';
const READY = '44444444-4444-4444-8444-444444444444';
const OPENED_AT = new Date('2026-11-15T07:12:00.000Z');

/** A calendar as it was before members: her key, her name, her progress on the doors. */
async function seedBefore(): Promise<void> {
  const db = database.db;
  await sql`
    INSERT INTO calendars (id, slug, title, recipient_name, theme, locale, time_zone,
      default_open_time, access_key, follower_key, created_at)
    VALUES
      (${CALENDAR}, 'bursdag', 'Bursdagsuka', 'Karoline', 'birthday', 'nb', 'Europe/Oslo',
        '08:00', 'her-key', 'follow-key', '2026-11-01T10:00:00Z'),
      (${EMPTY}, 'tom', 'Tom', 'Ida', 'christmas', 'nb', 'Europe/Oslo',
        '08:00', 'ida-key', 'ida-follow', '2026-11-02T10:00:00Z')
  `.execute(db);
  for (const [id, number, opened] of [
    [OPENED, 1, OPENED_AT],
    [READY, 2, null],
  ] as const) {
    await sql`
      INSERT INTO doors (id, calendar_id, number, opens_on, open_time, opens_at, featured, hidden,
        title, message, confetti, notification_title, notification_body, notified_at,
        first_opened_at)
      VALUES (${id}, ${CALENDAR}, ${number}, '2026-11-15', NULL, '2026-11-15T07:00:00Z', false,
        false, 'Luke', '', false, 'Luke', '', '2026-11-15T07:00:00Z', ${opened})
    `.execute(db);
  }
  await sql`
    INSERT INTO door_comments (id, door_id, author, role, text, created_at) VALUES
      (gen_random_uuid(), ${OPENED}, 'Karoline', 'recipient', 'Så fint!', now()),
      (gen_random_uuid(), ${OPENED}, 'Johann', 'follower', 'Ja!', now()),
      (gen_random_uuid(), ${OPENED}, 'Johann', 'giver', 'Kos deg', now())
  `.execute(db);
  await sql`
    INSERT INTO subscriptions (id, calendar_id, endpoint, p256dh, auth, created_at)
    VALUES (gen_random_uuid(), ${CALENDAR}, 'https://push.example/her', 'p', 'a', now())
  `.execute(db);
}

describe('M0010MembersMigration', () => {
  it('turns each recipient into the first member, with her key, her opened doors and her comments, and back', async () => {
    const migrator = database.migrator();
    expect((await migrator.migrateTo('0009_door_comments')).error).toBeUndefined();
    await seedBefore();

    expect((await migrator.migrateTo('0010_members')).error).toBeUndefined();

    const members = await database.db
      .selectFrom('members')
      .selectAll()
      .orderBy('added_at')
      .execute();
    expect(members).toEqual([
      expect.objectContaining({ calendar_id: CALENDAR, name: 'Karoline', key: 'her-key' }),
      expect.objectContaining({ calendar_id: EMPTY, name: 'Ida', key: 'ida-key' }),
    ]);
    const karoline = members[0]?.id;
    await expect(database.db.selectFrom('door_openings').selectAll().execute()).resolves.toEqual([
      { door_id: OPENED, member_id: karoline, opened_at: OPENED_AT },
    ]);
    const comments = await database.db
      .selectFrom('door_comments')
      .select(['author', 'role', 'member_id'])
      .orderBy('role')
      .execute();
    expect(comments).toEqual([
      { author: 'Johann', role: 'follower', member_id: null },
      { author: 'Johann', role: 'giver', member_id: null },
      { author: 'Karoline', role: 'member', member_id: karoline },
    ]);
    await expect(
      database.db.selectFrom('subscriptions').select('member_id').execute(),
    ).resolves.toEqual([{ member_id: null }]);
    await expect(
      database.db.selectFrom('calendars').select(['follower_key']).orderBy('created_at').execute(),
    ).resolves.toEqual([{ follower_key: 'follow-key' }, { follower_key: 'ida-follow' }]);

    expect((await migrator.migrateTo('0009_door_comments')).error).toBeUndefined();

    const calendars = await sql<{
      recipient_name: string;
      access_key: string;
    }>`SELECT recipient_name, access_key FROM calendars ORDER BY created_at`.execute(database.db);
    expect(calendars.rows).toEqual([
      { recipient_name: 'Karoline', access_key: 'her-key' },
      { recipient_name: 'Ida', access_key: 'ida-key' },
    ]);
    const doors = await sql<{
      id: string;
      first_opened_at: Date | null;
    }>`SELECT id, first_opened_at FROM doors ORDER BY number`.execute(database.db);
    expect(doors.rows).toEqual([
      { id: OPENED, first_opened_at: OPENED_AT },
      { id: READY, first_opened_at: null },
    ]);
    const roles = await sql<{ role: string }>`
      SELECT role FROM door_comments ORDER BY role
    `.execute(database.db);
    expect(roles.rows.map((row) => row.role)).toEqual(['follower', 'giver', 'recipient']);

    expect((await migrator.migrateToLatest()).error).toBeUndefined();
  });
});
