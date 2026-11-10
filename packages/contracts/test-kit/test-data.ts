import { randomUUID } from 'node:crypto';
import type {
  Calendar,
  CalendarId,
  Door,
  DoorContent,
  DoorId,
  Subscription,
  SubscriptionId,
} from '../src/index.js';

export const T0 = new Date('2026-11-15T07:00:00.000Z');

export function hoursAfter(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 3_600_000);
}

export function daysAfter(base: Date, days: number): Date {
  return hoursAfter(base, days * 24);
}

/**
 * Test data builders. Ids and slugs are fresh on every call, so suites can share a database
 * without collisions. Use one instance per test.
 */
export class TestData {
  public calendarId(): CalendarId {
    return randomUUID() as CalendarId;
  }

  public doorId(): DoorId {
    return randomUUID() as DoorId;
  }

  public subscriptionId(): SubscriptionId {
    return randomUUID() as SubscriptionId;
  }

  public slug(): string {
    return `cal-${randomUUID().slice(0, 8)}`;
  }

  public calendar(overrides: Partial<Calendar> = {}): Calendar {
    return {
      id: this.calendarId(),
      slug: this.slug(),
      title: 'Bursdagsuka',
      recipientName: 'Ida',
      theme: 'birthday',
      locale: 'nb',
      accessKey: `key-${randomUUID()}`,
      createdAt: T0,
      ...overrides,
    };
  }

  public content(overrides: Partial<DoorContent> = {}): DoorContent {
    return {
      title: 'Ta med badetøy',
      message: 'Du trenger det snart.',
      imageUrl: null,
      linkUrl: null,
      countdown: null,
      confetti: false,
      ...overrides,
    };
  }

  public door(calendarId: CalendarId, overrides: Partial<Door> = {}): Door {
    return {
      id: this.doorId(),
      calendarId,
      number: 1,
      opensAt: T0,
      content: this.content(),
      notification: { title: 'Luke 1 er åpen', body: 'Et nytt hint venter.' },
      notifiedAt: null,
      firstOpenedAt: null,
      ...overrides,
    };
  }

  public subscription(calendarId: CalendarId, overrides: Partial<Subscription> = {}): Subscription {
    return {
      id: this.subscriptionId(),
      calendarId,
      endpoint: `https://push.example.com/${randomUUID()}`,
      keys: { p256dh: 'BPublicKey', auth: 'authSecret' },
      createdAt: T0,
      ...overrides,
    };
  }
}
