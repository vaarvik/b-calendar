import { z } from 'zod';
import { COMMENT_ROLES } from './comments.model.js';
import type { CommentRole } from './comments.model.js';

export interface DoorCommentDto {
  readonly id: string;
  readonly author: string;
  readonly role: CommentRole;
  readonly text: string;
  readonly createdAt: string;
}

export const DoorCommentDtoSchema: z.ZodType<DoorCommentDto> = z.object({
  id: z.string(),
  author: z.string(),
  role: z.enum(COMMENT_ROLES),
  text: z.string(),
  createdAt: z.string(),
});

export interface DoorCommentsResponseDto {
  readonly comments: readonly DoorCommentDto[];
}

export const DoorCommentsResponseDtoSchema: z.ZodType<DoorCommentsResponseDto> = z.object({
  comments: z.array(DoorCommentDtoSchema),
});

/**
 * A new comment. `author` only matters on a follower's link and for the giver; `endpoint` is the
 * writer's own push endpoint, so their phone is not told about their own comment.
 */
export interface AddDoorCommentRequestDto {
  readonly author?: string;
  readonly text: string;
  readonly endpoint?: string;
}

export const AddDoorCommentRequestDtoSchema: z.ZodType<AddDoorCommentRequestDto> = z.object({
  author: z.string().max(100).exactOptional(),
  text: z.string().max(2000),
  endpoint: z.string().max(2000).exactOptional(),
});
