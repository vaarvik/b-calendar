/** One push notification. */
export interface PushMessage {
  readonly title: string;
  readonly body: string;
  /** Opened when the notification is tapped; a path on the app's origin. */
  readonly url: string;
  /** Notifications with the same tag replace each other. */
  readonly tag: string;
}

/** What happened to one push. `gone`: the browser unsubscribed; forget the subscription. */
export type PushOutcome = 'sent' | 'gone' | 'failed';

/** What to do about a door's notification now. */
export type NotificationDecision = 'wait' | 'send' | 'skip';
