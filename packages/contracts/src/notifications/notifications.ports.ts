import type { Calendar } from '../calendars/calendars.model.js';
import type { Door } from '../doors/doors.model.js';
import type { PushEndpoint } from '../subscriptions/subscriptions.model.js';
import type { NotificationDecision, PushMessage, PushOutcome } from './notifications.model.js';

/** Delivers push notifications (Web Push). */
export interface PushSender {
  /** Never throws for delivery problems; reports them as the outcome. */
  send(endpoint: PushEndpoint, message: PushMessage): Promise<PushOutcome>;
}

/**
 * Decides whether a door's notification goes out. Late notifications are skipped rather than
 * sent, so a door added in the past, or a server that was down for a day, does not ping her
 * about something old.
 */
export interface NotificationDecider {
  decide(door: Door, now: Date): NotificationDecision;
}

/** Builds the notification for a door. */
export interface PushMessageFactory {
  door(calendar: Calendar, door: Door): PushMessage;
  test(calendar: Calendar): PushMessage;
}
