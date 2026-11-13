import {
  KeyCalendarAccessAuthenticator,
  SubscribeUseCase,
  ZodInputValidator,
} from '@b-calendar/application';
import { UnauthenticatedError, ValidationError } from '@b-calendar/contracts';
import { T0, TestData } from '@b-calendar/contracts/test-kit';
import { ConstantTimeSecretMatcher } from '@b-calendar/domain';
import { InMemoryCalendarRepository, InMemorySubscriptionRepository } from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { ManualClock, RandomIds } from '../shared/fakes.js';

describe('Subscribe', () => {
  async function setup() {
    const calendars = new InMemoryCalendarRepository();
    const subscriptions = new InMemorySubscriptionRepository();
    const calendar = new TestData().calendar();
    await calendars.create(calendar);
    const subscribe = new SubscribeUseCase(
      new KeyCalendarAccessAuthenticator(calendars, new ConstantTimeSecretMatcher()),
      subscriptions,
      new RandomIds(),
      new ManualClock(),
      new ZodInputValidator(),
    );
    return { calendar, subscriptions, subscribe };
  }

  const endpoint = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: 'p', auth: 'a' } };

  it('stores the browser’s subscription for the calendar', async () => {
    const { calendar, subscriptions, subscribe } = await setup();

    await subscribe.execute({ slug: calendar.slug, accessKey: calendar.accessKey, endpoint });

    await expect(subscriptions.listByCalendar(calendar.id)).resolves.toEqual([
      expect.objectContaining({ ...endpoint, calendarId: calendar.id, createdAt: T0 }),
    ]);
  });

  it('lets a follower’s phone get the notifications too', async () => {
    const { calendar, subscriptions, subscribe } = await setup();

    await subscribe.execute({ slug: calendar.slug, accessKey: calendar.followerKey, endpoint });

    await expect(subscriptions.listByCalendar(calendar.id)).resolves.toHaveLength(1);
  });

  it('refuses a wrong key and a malformed endpoint', async () => {
    const { calendar, subscribe } = await setup();

    await expect(
      subscribe.execute({ slug: calendar.slug, accessKey: 'x', endpoint }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      subscribe.execute({
        slug: calendar.slug,
        accessKey: calendar.accessKey,
        endpoint: { ...endpoint, endpoint: 'http://insecure' },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
