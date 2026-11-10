import type { CalendarId } from '../shared/shared.model.js';

export interface NotifyOpenedDoorsOutput {
  /** Doors whose notification went out. */
  readonly notified: number;
  /** Doors marked as notified without sending, because it was too late. */
  readonly skipped: number;
}

/**
 * Sends the notification of every door that has opened. Run every half minute by a scheduler.
 * A door is marked before it is sent: at most one notification per door, even after a crash.
 */
export interface NotifyOpenedDoors {
  execute(): Promise<NotifyOpenedDoorsOutput>;
}

export interface SendTestNotificationOutput {
  readonly sent: number;
  readonly failed: number;
}

/** An admin checks that notifications reach the recipient's phone. */
export interface SendTestNotification {
  /** @throws NotFoundError when the calendar does not exist. */
  execute(input: { readonly calendarId: CalendarId }): Promise<SendTestNotificationOutput>;
}
