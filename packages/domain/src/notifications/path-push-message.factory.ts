import type {
  Calendar,
  CalendarLocale,
  Door,
  PushMessage,
  PushMessageFactory,
} from '@b-calendar/contracts';

const TEST_COPY: Readonly<Record<CalendarLocale, { title: string; body: string }>> = {
  nb: { title: 'Varsler virker 🎉', body: 'Du får beskjed når neste luke åpner.' },
  en: { title: 'Notifications work 🎉', body: 'You will hear from us when the next door opens.' },
};

/**
 * Notifications open the calendar's own page. The access key rides along, so a tap opens it
 * even on a phone where the app was installed from another link.
 */
export class PathPushMessageFactory implements PushMessageFactory {
  public door(calendar: Calendar, door: Door): PushMessage {
    return {
      title: door.notification.title,
      body: door.notification.body,
      url: `${this.path(calendar)}&door=${String(door.number)}`,
      tag: `door-${door.id}`,
    };
  }

  public test(calendar: Calendar): PushMessage {
    return { ...TEST_COPY[calendar.locale], url: this.path(calendar), tag: 'test' };
  }

  private path(calendar: Calendar): string {
    return `/c/${calendar.slug}?k=${encodeURIComponent(calendar.accessKey)}`;
  }
}
