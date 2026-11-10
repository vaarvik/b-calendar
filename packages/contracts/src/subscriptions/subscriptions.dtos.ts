import { z } from 'zod';
import { PushEndpointSchema } from './subscriptions.model.js';
import type { PushEndpoint } from './subscriptions.model.js';

export type SubscribeRequestDto = PushEndpoint;
export const SubscribeRequestDtoSchema: z.ZodType<SubscribeRequestDto> = PushEndpointSchema;

export interface PushConfigResponseDto {
  /** VAPID public key for `pushManager.subscribe`; null when push is not configured. */
  readonly vapidPublicKey: string | null;
}

export const PushConfigResponseDtoSchema: z.ZodType<PushConfigResponseDto> = z.object({
  vapidPublicKey: z.string().nullable(),
});
