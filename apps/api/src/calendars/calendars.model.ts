import { InstantSchema } from '@b-calendar/contracts';
import { z } from 'zod';
import { DoorDraftRowSchema } from '../doors/doors.model.js';

/** A published door as stored in a version's jsonb: the draft fields plus id, number and instant. */
export const PublishedDoorRowsSchema = z.array(
  z.intersection(
    DoorDraftRowSchema,
    z.object({ id: z.uuid(), number: z.int().positive(), opensAt: InstantSchema }),
  ),
);
