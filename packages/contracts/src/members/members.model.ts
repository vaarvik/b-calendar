import { z } from 'zod';
import type { CalendarId, MemberId } from '../shared/shared.model.js';

/**
 * One person sharing a calendar. Their link (`/c/<slug>?k=<key>`) is who they are: they open
 * their own doors, and their comments carry their name.
 */
export interface Member {
  readonly id: MemberId;
  readonly calendarId: CalendarId;
  /** "Hei, Karoline"; also the name on their comments. */
  readonly name: string;
  /** The secret in their link; whoever has it is this member. */
  readonly key: string;
  readonly addedAt: Date;
}

export const MemberNameSchema = z.string().trim().min(1).max(40);
