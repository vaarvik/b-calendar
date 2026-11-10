import type { PushEndpoint } from '@b-calendar/contracts';

/**
 * Where this browser stands on notifications.
 * - `install`: iOS Safari; web push only works from the Home Screen app.
 * - `unsupported`: no push in this browser.
 * - `ask`: can ask for permission (must follow a tap).
 * - `on`: permission granted.
 * - `blocked`: the user said no; only the browser's settings can change that.
 */
export type PushReadiness = 'install' | 'unsupported' | 'ask' | 'on' | 'blocked';

/** The browser's notification permission and push subscription. */
export interface PushSubscriber {
  readiness(): PushReadiness;
  /**
   * Asks for permission if needed and subscribes. Call from a tap.
   *
   * @returns the endpoint to send to the API, or null when permission was refused.
   */
  subscribe(vapidPublicKey: string): Promise<PushEndpoint | null>;
}
