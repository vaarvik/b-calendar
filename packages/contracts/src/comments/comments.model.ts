import { z } from 'zod';
import type { CommentId, DoorId } from '../shared/shared.model.js';

/** Who wrote a comment: her, a follower, or the giver (the admin). */
export const COMMENT_ROLES = ['recipient', 'follower', 'giver'] as const;
export type CommentRole = (typeof COMMENT_ROLES)[number];

/** A comment someone left behind a door. */
export interface DoorComment {
  readonly id: CommentId;
  readonly doorId: DoorId;
  /** Her name on her link, or the name a follower or the giver gave. */
  readonly author: string;
  readonly role: CommentRole;
  readonly text: string;
  readonly createdAt: Date;
}

/** What a follower's name and a comment's text may be. */
export const CommentAuthorSchema = z.string().trim().min(1).max(40);
export const CommentTextSchema = z.string().trim().min(1).max(1000);
