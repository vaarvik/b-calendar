import { PathPushMessageFactory } from '@b-calendar/domain';
import { TestData } from '@b-calendar/contracts/test-kit';
import { describe, expect, it } from 'vitest';

describe('PathPushMessageFactory', () => {
  const factory = new PathPushMessageFactory();
  const data = new TestData();
  const calendar = data.calendar({ slug: 'ida-30', accessKey: 'k/ey+1' });

  it('opens the door from its notification', () => {
    const door = data.door(calendar.id, {
      number: 3,
      notification: { title: 'Dag 3', body: 'Nytt hint!' },
    });

    expect(factory.door(calendar, door)).toEqual({
      title: 'Dag 3',
      body: 'Nytt hint!',
      url: '/c/ida-30?k=k%2Fey%2B1&door=3',
      tag: `door-${door.id}`,
    });
  });

  it('writes the test notification in the calendar’s language', () => {
    expect(factory.test(calendar)).toEqual({
      title: 'Varsler virker 🎉',
      body: 'Du får beskjed når neste luke åpner.',
      url: '/c/ida-30?k=k%2Fey%2B1',
      tag: 'test',
    });
    expect(factory.test({ ...calendar, locale: 'en' }).title).toBe('Notifications work 🎉');
  });
});
