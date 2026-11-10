import { NotifyOpenedDoorsUseCase, SendTestNotificationUseCase } from '@b-calendar/application';
import { T0, TestData, hoursAfter } from '@b-calendar/contracts/test-kit';
import { GraceWindowNotificationDecider, PathPushMessageFactory } from '@b-calendar/domain';
import {
  InMemoryCalendarRepository,
  InMemoryDoorRepository,
  InMemorySubscriptionRepository,
} from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { ManualClock, RecordingPushSender, SilentLogger } from '../shared/fakes.js';

async function setup(outcomes: Record<string, 'sent' | 'gone' | 'failed'> = {}) {
  const data = new TestData();
  const calendars = new InMemoryCalendarRepository();
  const doors = new InMemoryDoorRepository();
  const subscriptions = new InMemorySubscriptionRepository();
  const clock = new ManualClock();
  const push = new RecordingPushSender(outcomes);
  const messages = new PathPushMessageFactory();
  const calendar = data.calendar();
  await calendars.create(calendar);
  return {
    data,
    calendar,
    doors,
    subscriptions,
    clock,
    push,
    notify: new NotifyOpenedDoorsUseCase(
      doors,
      doors,
      calendars,
      subscriptions,
      subscriptions,
      push,
      new GraceWindowNotificationDecider({ graceMinutes: 120 }),
      messages,
      clock,
      new SilentLogger(),
    ),
    test: new SendTestNotificationUseCase(calendars, subscriptions, subscriptions, push, messages),
  };
}

describe('NotifyOpenedDoors', () => {
  it('sends an opened door’s notification to every subscriber, once', async () => {
    const { notify, doors, subscriptions, data, calendar, push } = await setup();
    const door = data.door(calendar.id, { opensAt: T0 });
    await doors.create(door);
    await doors.create(data.door(calendar.id, { number: 2, opensAt: hoursAfter(T0, 24) }));
    await subscriptions.upsert(data.subscription(calendar.id));
    await subscriptions.upsert(data.subscription(calendar.id));

    await expect(notify.execute()).resolves.toEqual({ notified: 1, skipped: 0 });
    await expect(notify.execute()).resolves.toEqual({ notified: 0, skipped: 0 });

    expect(push.sent).toHaveLength(2);
    expect(push.sent[0]?.message.title).toBe(door.notification.title);
    await expect(doors.getById(door.id)).resolves.toMatchObject({ notifiedAt: T0 });
  });

  it('skips doors that opened too long ago, without sending', async () => {
    const { notify, doors, subscriptions, data, calendar, push } = await setup();
    await doors.create(data.door(calendar.id, { opensAt: hoursAfter(T0, -5) }));
    await subscriptions.upsert(data.subscription(calendar.id));

    await expect(notify.execute()).resolves.toEqual({ notified: 0, skipped: 1 });
    expect(push.sent).toEqual([]);
  });

  it('forgets subscriptions the browser has dropped, and survives failures', async () => {
    const { notify, doors, subscriptions, data, calendar } = await setup({
      'https://push.example.com/gone': 'gone',
      'https://push.example.com/broken': 'failed',
    });
    await doors.create(data.door(calendar.id, { opensAt: T0 }));
    const kept = data.subscription(calendar.id, { endpoint: 'https://push.example.com/broken' });
    await subscriptions.upsert(kept);
    await subscriptions.upsert(
      data.subscription(calendar.id, { endpoint: 'https://push.example.com/gone' }),
    );

    await expect(notify.execute()).resolves.toEqual({ notified: 1, skipped: 0 });
    await expect(subscriptions.listByCalendar(calendar.id)).resolves.toEqual([kept]);
  });
});

describe('SendTestNotification', () => {
  it('pings every subscriber and counts what got through', async () => {
    const { test, subscriptions, data, calendar, push } = await setup({
      'https://push.example.com/broken': 'failed',
      'https://push.example.com/gone': 'gone',
    });
    await subscriptions.upsert(data.subscription(calendar.id));
    await subscriptions.upsert(
      data.subscription(calendar.id, { endpoint: 'https://push.example.com/broken' }),
    );
    await subscriptions.upsert(
      data.subscription(calendar.id, { endpoint: 'https://push.example.com/gone' }),
    );

    await expect(test.execute({ calendarId: calendar.id })).resolves.toEqual({
      sent: 1,
      failed: 2,
    });
    expect(push.sent.map((push) => push.message.tag)).toEqual(['test', 'test', 'test']);
    await expect(subscriptions.listByCalendar(calendar.id)).resolves.toHaveLength(2);
  });
});
