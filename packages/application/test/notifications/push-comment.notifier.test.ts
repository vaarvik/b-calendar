import { PushCommentNotifier } from '@b-calendar/application';
import { TestData } from '@b-calendar/contracts/test-kit';
import { PathPushMessageFactory } from '@b-calendar/domain';
import { InMemorySubscriptionRepository } from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { RecordingPushSender, SilentLogger } from '../shared/fakes.js';

describe('PushCommentNotifier', () => {
  it('tells every subscribed phone but the writer’s, and forgets phones that unsubscribed', async () => {
    const data = new TestData();
    const calendar = data.calendar();
    const door = data.door(calendar.id, { number: 1 });
    const comment = data.comment(door.id, { author: 'Johann' });
    const subscriptions = new InMemorySubscriptionRepository();
    const hers = data.subscription(calendar.id, { endpoint: 'https://push.example/hers' });
    const writer = data.subscription(calendar.id, { endpoint: 'https://push.example/writer' });
    const gone = data.subscription(calendar.id, { endpoint: 'https://push.example/gone' });
    const broken = data.subscription(calendar.id, { endpoint: 'https://push.example/broken' });
    for (const subscription of [hers, writer, gone, broken]) {
      await subscriptions.upsert(subscription);
    }
    await subscriptions.upsert(data.subscription(data.calendarId()));
    const push = new RecordingPushSender({ [gone.endpoint]: 'gone', [broken.endpoint]: 'failed' });
    const logger = new SilentLogger();
    const notifier = new PushCommentNotifier(
      subscriptions,
      subscriptions,
      push,
      new PathPushMessageFactory(),
      logger,
    );

    await notifier.notify(calendar, door, comment, writer.endpoint);

    expect(push.sent.map((sent) => sent.endpoint).sort()).toEqual(
      [hers.endpoint, gone.endpoint, broken.endpoint].sort(),
    );
    expect(push.sent[0]?.message.title).toContain('Johann');
    await expect(subscriptions.listByCalendar(calendar.id)).resolves.toHaveLength(3);
    expect(logger.warnings).toHaveLength(1);
  });
});
