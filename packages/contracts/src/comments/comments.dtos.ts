import { z } from 'zod';

/**
 * A comment's role on the wire. A member's comment is still called `recipient` here, which app
 * versions from before members understand (a Home Screen app resumed without reloading still runs
 * the old bundle); `memberId` tells whose it is. Becomes the CommentRole in December 2026.
 */
export const COMMENT_DTO_ROLES = ['recipient', 'follower', 'giver'] as const;
export type CommentDtoRole = (typeof COMMENT_DTO_ROLES)[number];

export interface DoorCommentDto {
  readonly id: string;
  readonly author: string;
  readonly role: CommentDtoRole;
  /** The member who wrote it; null for the follower link and the giver. */
  readonly memberId: string | null;
  readonly text: string;
  readonly createdAt: string;
}

export const DoorCommentDtoSchema: z.ZodType<DoorCommentDto> = z.object({
  id: z.string(),
  author: z.string(),
  role: z.enum(COMMENT_DTO_ROLES),
  memberId: z.string().nullable(),
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
 * A new comment. `author` only matters on the follower link and for the giver; `endpoint` is the
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
