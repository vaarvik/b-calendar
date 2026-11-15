import type { CalendarAccess } from '../calendars/calendars.model.js';
import type { PushEndpoint } from './subscriptions.model.js';

export interface SubscribeInput extends CalendarAccess {
  readonly endpoint: PushEndpoint;
}

/** A browser with a link asks for notifications. */
export interface Subscribe {
  /**
   * @throws UnauthenticatedError when the slug or the key is wrong.
   * @throws ValidationError when the endpoint is malformed.
   */
  execute(input: SubscribeInput): Promise<void>;
}
