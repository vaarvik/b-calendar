import type {
  Calendar,
  CalendarLocale,
  Door,
  DoorComment,
  PushMessage,
  PushMessageFactory,
} from '@b-calendar/contracts';

const TEST_COPY: Readonly<Record<CalendarLocale, { title: string; body: string }>> = {
  nb: { title: 'Varsler virker 🎉', body: 'Du får beskjed når neste luke åpner.' },
  en: { title: 'Notifications work 🎉', body: 'You will hear from us when the next door opens.' },
};

const COMMENTED: Readonly<Record<CalendarLocale, (author: string, number: number) => string>> = {
  nb: (author, number) => `💬 ${author} kommenterte luke ${String(number)}`,
  en: (author, number) => `💬 ${author} commented on door ${String(number)}`,
};

/** A comment longer than this is shortened in its notification. */
const COMMENT_PREVIEW = 120;

/**
 * Notifications open the calendar's own page, without a key: each phone opens it with the link it
 * was set up with, hers or a follower's, so a follower's tap never becomes hers.
 */
export class PathPushMessageFactory implements PushMessageFactory {
  public door(calendar: Calendar, door: Door): PushMessage {
    return {
      title: door.notification.title,
      body: door.notification.body,
      url: this.doorPath(calendar, door),
      tag: `door-${door.id}`,
    };
  }

  public comment(calendar: Calendar, door: Door, comment: DoorComment): PushMessage {
    const text =
      comment.text.length > COMMENT_PREVIEW
        ? `${comment.text.slice(0, COMMENT_PREVIEW - 1)}…`
        : comment.text;
    return {
      title: COMMENTED[calendar.locale](comment.author, door.number),
      body: text,
      url: this.doorPath(calendar, door),
      tag: `comment-${comment.id}`,
    };
  }

  public test(calendar: Calendar): PushMessage {
    return { ...TEST_COPY[calendar.locale], url: this.path(calendar), tag: 'test' };
  }

  private path(calendar: Calendar): string {
    return `/c/${calendar.slug}`;
  }

  private doorPath(calendar: Calendar, door: Door): string {
    return `${this.path(calendar)}?door=${String(door.number)}`;
  }
}
