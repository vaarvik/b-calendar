import { PathPushMessageFactory } from '@b-calendar/domain';
import { TestData } from '@b-calendar/contracts/test-kit';
import { describe, expect, it } from 'vitest';

describe('PathPushMessageFactory', () => {
  const factory = new PathPushMessageFactory();
  const data = new TestData();
  const calendar = data.calendar({ slug: 'ida-30', accessKey: 'k/ey+1' });

  it('opens the door from its notification, without a key, so each phone uses its own link', () => {
    const door = data.door(calendar.id, {
      number: 3,
      notification: { title: 'Dag 3', body: 'Nytt hint!' },
    });

    expect(factory.door(calendar, door)).toEqual({
      title: 'Dag 3',
      body: 'Nytt hint!',
      url: '/c/ida-30?door=3',
      tag: `door-${door.id}`,
    });
  });

  it('writes the test notification in the calendar’s language', () => {
    expect(factory.test(calendar)).toEqual({
      title: 'Varsler virker 🎉',
      body: 'Du får beskjed når neste luke åpner.',
      url: '/c/ida-30',
      tag: 'test',
    });
    expect(factory.test({ ...calendar, locale: 'en' }).title).toBe('Notifications work 🎉');
  });

  it('tells who commented on which door, shortening a long comment', () => {
    const door = data.door(calendar.id, { number: 2 });
    const comment = data.comment(door.id, { author: 'Johann', text: 'x'.repeat(150) });

    expect(factory.comment(calendar, door, comment)).toEqual({
      title: '💬 Johann kommenterte luke 2',
      body: `${'x'.repeat(119)}…`,
      url: '/c/ida-30?door=2',
      tag: `comment-${comment.id}`,
    });
    expect(
      factory.comment({ ...calendar, locale: 'en' }, door, { ...comment, text: 'Hi' }),
    ).toMatchObject({ title: '💬 Johann commented on door 2', body: 'Hi' });
  });
});
