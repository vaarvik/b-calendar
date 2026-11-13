import { randomUUID } from 'node:crypto';
import type {
  Calendar,
  CalendarId,
  CalendarVersion,
  Door,
  DoorContent,
  DoorId,
  DraftDoor,
  MediaId,
  PublishedDoor,
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

  public mediaId(): MediaId {
    return randomUUID() as MediaId;
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
      timeZone: 'Europe/Oslo',
      defaultOpenTime: '08:00',
      accessKey: `key-${randomUUID()}`,
      followerKey: `follow-${randomUUID()}`,
      createdAt: T0,
      ...overrides,
    };
  }

  public content(overrides: Partial<DoorContent> = {}): DoorContent {
    return {
      title: 'Ta med badetøy',
      message: 'Du trenger det snart.',
      imageUrl: null,
      secondImageUrl: null,
      videoUrl: null,
      audioUrl: null,
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
      opensOn: '2026-11-15',
      openTime: null,
      opensAt: T0,
      featured: false,
      hidden: false,
      content: this.content(),
      notification: { title: 'Luke 1 er åpen', body: 'Et nytt hint venter.' },
      notifiedAt: null,
      firstOpenedAt: null,
      ...overrides,
    };
  }

  public draftDoor(calendarId: CalendarId, overrides: Partial<DraftDoor> = {}): DraftDoor {
    return {
      id: this.doorId(),
      calendarId,
      opensOn: '2026-11-15',
      openTime: null,
      featured: false,
      hidden: false,
      content: this.content(),
      notification: { title: 'Luke 1 er åpen', body: 'Et nytt hint venter.' },
      addedAt: T0,
      ...overrides,
    };
  }

  public publishedDoor(overrides: Partial<PublishedDoor> = {}): PublishedDoor {
    return {
      id: this.doorId(),
      number: 1,
      opensOn: '2026-11-15',
      openTime: null,
      opensAt: T0,
      featured: false,
      hidden: false,
      content: this.content(),
      notification: { title: 'Luke 1 er åpen', body: 'Et nytt hint venter.' },
      ...overrides,
    };
  }

  public version(
    calendarId: CalendarId,
    overrides: Partial<CalendarVersion> = {},
  ): CalendarVersion {
    return {
      calendarId,
      version: 1,
      publishedAt: T0,
      doors: [this.publishedDoor()],
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
