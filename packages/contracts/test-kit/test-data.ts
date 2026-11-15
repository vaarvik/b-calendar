import { randomUUID } from 'node:crypto';
import type {
  Account,
  AccountId,
  Calendar,
  CalendarId,
  CalendarVersion,
  CommentId,
  DoorComment,
  Door,
  DoorContent,
  DoorId,
  DoorOpening,
  DraftDoor,
  MediaFile,
  MediaId,
  Member,
  MemberId,
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

  public commentId(): CommentId {
    return randomUUID() as CommentId;
  }

  public comment(doorId: DoorId, overrides: Partial<DoorComment> = {}): DoorComment {
    return {
      id: this.commentId(),
      doorId,
      author: 'Ida',
      role: 'follower',
      memberId: null,
      text: 'Gleder meg!',
      createdAt: T0,
      ...overrides,
    };
  }

  public accountId(): AccountId {
    return randomUUID() as AccountId;
  }

  public account(overrides: Partial<Account> = {}): Account {
    return {
      id: this.accountId(),
      name: 'Johann',
      email: 'johann@example.com',
      identities: [{ provider: 'google', subject: `google-${randomUUID()}` }],
      createdAt: T0,
      ...overrides,
    };
  }

  public mediaFile(overrides: Partial<MediaFile> = {}): MediaFile {
    return {
      id: this.mediaId(),
      ownerId: null,
      contentType: 'image/jpeg',
      bytes: 1024,
      createdAt: T0,
      ...overrides,
    };
  }

  public memberId(): MemberId {
    return randomUUID() as MemberId;
  }

  public member(calendarId: CalendarId, overrides: Partial<Member> = {}): Member {
    return {
      id: this.memberId(),
      calendarId,
      name: 'Ida',
      key: `key-${randomUUID()}`,
      addedAt: T0,
      ...overrides,
    };
  }

  public opening(
    doorId: DoorId,
    memberId: MemberId,
    overrides: Partial<DoorOpening> = {},
  ): DoorOpening {
    return { doorId, memberId, openedAt: T0, ...overrides };
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
      ownerId: null,
      theme: 'birthday',
      locale: 'nb',
      timeZone: 'Europe/Oslo',
      defaultOpenTime: '08:00',
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
      memberId: null,
      createdAt: T0,
      ...overrides,
    };
  }
}
