import { z } from 'zod';
import type { CalendarId, SubscriptionId } from '../shared/shared.model.js';

/** The browser's PushSubscription, as `subscription.toJSON()` gives it. */
export interface PushEndpoint {
  readonly endpoint: string;
  readonly keys: { readonly p256dh: string; readonly auth: string };
}

export const PushEndpointSchema: z.ZodType<PushEndpoint> = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
});

/** One browser that gets a calendar's notifications. */
export interface Subscription extends PushEndpoint {
  readonly id: SubscriptionId;
  readonly calendarId: CalendarId;
  readonly createdAt: Date;
}
