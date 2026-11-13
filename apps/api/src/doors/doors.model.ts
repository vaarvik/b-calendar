import { InstantSchema, LocalDateSchema, TimeOfDaySchema } from '@b-calendar/contracts';
import type { DoorDraft } from '@b-calendar/contracts';
import { z } from 'zod';

/**
 * A draft door as stored in jsonb. Read with the stored shape, not with the input rules: a row
 * written under older rules (an image at `/icon-512.png`) must still load.
 */
export const DoorDraftRowSchema: z.ZodType<DoorDraft> = z.object({
  opensOn: LocalDateSchema,
  openTime: TimeOfDaySchema.nullable(),
  featured: z.boolean(),
  content: z.object({
    title: z.string(),
    message: z.string(),
    imageUrl: z.string().nullable(),
    linkUrl: z.string().nullable(),
    countdown: z.object({ to: InstantSchema, label: z.string() }).nullable(),
    confetti: z.boolean(),
  }),
  notification: z.object({ title: z.string(), body: z.string() }),
});
