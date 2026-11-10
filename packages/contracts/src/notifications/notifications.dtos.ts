import { z } from 'zod';

export interface SendTestNotificationResponseDto {
  readonly sent: number;
  readonly failed: number;
}

export const SendTestNotificationResponseDtoSchema: z.ZodType<SendTestNotificationResponseDto> =
  z.object({ sent: z.int().nonnegative(), failed: z.int().nonnegative() });
