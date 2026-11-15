import {
  KeyCalendarAccessAuthenticator,
  SubscribeUseCase,
  ZodInputValidator,
} from '@b-calendar/application';
import { UnauthenticatedError, ValidationError } from '@b-calendar/contracts';
import { T0, TestData } from '@b-calendar/contracts/test-kit';
import { ConstantTimeSecretMatcher } from '@b-calendar/domain';
import {
  InMemoryCalendarRepository,
  InMemoryMemberRepository,
  InMemorySubscriptionRepository,
} from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { ManualClock, RandomIds } from '../shared/fakes.js';

describe('Subscribe', () => {
  async function setup() {
    const calendars = new InMemoryCalendarRepository();
    const subscriptions = new InMemorySubscriptionRepository();
    const members = new InMemoryMemberRepository();
    const data = new TestData();
    const calendar = data.calendar();
    await calendars.create(calendar);
    const ida = data.member(calendar.id);
    await members.create(ida);
    const subscribe = new SubscribeUseCase(
      new KeyCalendarAccessAuthenticator(calendars, members, new ConstantTimeSecretMatcher()),
      subscriptions,
      new RandomIds(),
      new ManualClock(),
      new ZodInputValidator(),
    );
    return { calendar, ida, subscriptions, subscribe };
  }

  const endpoint = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: 'p', auth: 'a' } };

  it('stores the browser’s subscription for the calendar, with the member whose link it is', async () => {
    const { calendar, ida, subscriptions, subscribe } = await setup();

    await subscribe.execute({ slug: calendar.slug, accessKey: ida.key, endpoint });

    await expect(subscriptions.listByCalendar(calendar.id)).resolves.toEqual([
      expect.objectContaining({
        ...endpoint,
        calendarId: calendar.id,
        memberId: ida.id,
        createdAt: T0,
      }),
    ]);
  });

  it('lets a phone with the follower link get the notifications too', async () => {
    const { calendar, subscriptions, subscribe } = await setup();

    await subscribe.execute({ slug: calendar.slug, accessKey: calendar.followerKey, endpoint });

    await expect(subscriptions.listByCalendar(calendar.id)).resolves.toEqual([
      expect.objectContaining({ memberId: null }),
    ]);
  });

  it('refuses a wrong key and a malformed endpoint', async () => {
    const { calendar, ida, subscribe } = await setup();

    await expect(
      subscribe.execute({ slug: calendar.slug, accessKey: 'x', endpoint }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      subscribe.execute({
        slug: calendar.slug,
        accessKey: ida.key,
        endpoint: { ...endpoint, endpoint: 'http://insecure' },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
