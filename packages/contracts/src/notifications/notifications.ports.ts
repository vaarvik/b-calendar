import type { Calendar } from '../calendars/calendars.model.js';
import type { DoorComment } from '../comments/comments.model.js';
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

/**
 * Builds notifications. Their links carry no key: each phone opens the calendar with its own link
 * (hers or a follower's), so a follower's tap never turns into hers.
 */
export interface PushMessageFactory {
  door(calendar: Calendar, door: Door): PushMessage;
  comment(calendar: Calendar, door: Door, comment: DoorComment): PushMessage;
  test(calendar: Calendar): PushMessage;
}

/** Tells everyone following a calendar about a new comment. */
export interface CommentNotifier {
  /**
   * Sends the comment to every phone with notifications on for the calendar, except the writer's
   * own (`except`, its push endpoint). Never throws for delivery problems.
   */
  notify(
    calendar: Calendar,
    door: Door,
    comment: DoorComment,
    except: string | null,
  ): Promise<void>;
}
