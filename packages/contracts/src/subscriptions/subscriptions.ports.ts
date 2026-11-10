import type { CalendarId, SubscriptionId } from '../shared/shared.model.js';
import type { Subscription } from './subscriptions.model.js';

/** Reads push subscriptions. */
export interface SubscriptionReader {
  /** Oldest first. */
  listByCalendar(calendarId: CalendarId): Promise<Subscription[]>;
}

/** Stores push subscriptions. */
export interface SubscriptionWriter {
  /**
   * Stores the subscription, or replaces the one with the same endpoint and calendar
   * (a browser that subscribes again keeps one row, with its first id).
   */
  upsert(subscription: Subscription): Promise<void>;
  /** Does nothing when the subscription is already gone. */
  remove(id: SubscriptionId): Promise<void>;
}
