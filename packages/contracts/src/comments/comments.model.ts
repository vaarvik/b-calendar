import { z } from 'zod';
import type { CalendarRole } from '../calendars/calendars.model.js';
import type { CommentId, DoorId } from '../shared/shared.model.js';

/** A comment someone left behind an open door. */
export interface DoorComment {
  readonly id: CommentId;
  readonly doorId: DoorId;
  /** Her name on her link, or the name a follower gave. */
  readonly author: string;
  /** Whose link wrote it. */
  readonly role: CalendarRole;
  readonly text: string;
  readonly createdAt: Date;
}

/** What a follower's name and a comment's text may be. */
export const CommentAuthorSchema = z.string().trim().min(1).max(40);
export const CommentTextSchema = z.string().trim().min(1).max(1000);
