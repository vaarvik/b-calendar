import { describe, expect, it } from 'vitest';
import type { CalendarWriter, SubscriptionReader, SubscriptionWriter } from '../../src/index.js';
import { FixtureHolder } from '../fixture.js';
import type { FixtureFactory } from '../fixture.js';
import { T0, TestData, hoursAfter } from '../test-data.js';

export interface SubscriptionRepositoryFixture {
  readonly writer: SubscriptionWriter;
  readonly reader: SubscriptionReader;
  readonly calendars: CalendarWriter;
}

/** Behaviour every SubscriptionWriter and SubscriptionReader pair must have. */
export function describeSubscriptionRepositoryContract(
  name: string,
  factory: FixtureFactory<SubscriptionRepositoryFixture>,
): void {
  describe(`${name} satisfies SubscriptionReader and SubscriptionWriter`, () => {
    const fixture = new FixtureHolder(factory);

    async function calendar(data: TestData) {
      const created = data.calendar();
      await fixture.current.calendars.create(created);
      return created.id;
    }

    it('lists a calendar’s subscriptions, oldest first', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const newer = data.subscription(calendarId, { createdAt: hoursAfter(T0, 1) });
      const older = data.subscription(calendarId, { createdAt: T0 });
      await fixture.current.writer.upsert(newer);
      await fixture.current.writer.upsert(older);
      await fixture.current.writer.upsert(data.subscription(await calendar(data)));

      await expect(fixture.current.reader.listByCalendar(calendarId)).resolves.toEqual([
        older,
        newer,
      ]);
    });

    it('keeps one subscription per endpoint, with its first id and the newest keys', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const first = data.subscription(calendarId);
      await fixture.current.writer.upsert(first);

      await fixture.current.writer.upsert(
        data.subscription(calendarId, {
          endpoint: first.endpoint,
          keys: { p256dh: 'BNewKey', auth: 'newAuth' },
          createdAt: hoursAfter(T0, 5),
        }),
      );

      await expect(fixture.current.reader.listByCalendar(calendarId)).resolves.toEqual([
        { ...first, keys: { p256dh: 'BNewKey', auth: 'newAuth' } },
      ]);
    });

    it('removes a subscription, and ignores one that is already gone', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const subscription = data.subscription(calendarId);
      await fixture.current.writer.upsert(subscription);

      await fixture.current.writer.remove(subscription.id);
      await fixture.current.writer.remove(subscription.id);

      await expect(fixture.current.reader.listByCalendar(calendarId)).resolves.toEqual([]);
    });
  });
}
