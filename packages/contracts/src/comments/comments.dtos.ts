import { z } from 'zod';
import { CALENDAR_ROLES } from '../calendars/calendars.model.js';
import type { CalendarRole } from '../calendars/calendars.model.js';

export interface DoorCommentDto {
  readonly id: string;
  readonly author: string;
  readonly role: CalendarRole;
  readonly text: string;
  readonly createdAt: string;
}

export const DoorCommentDtoSchema: z.ZodType<DoorCommentDto> = z.object({
  id: z.string(),
  author: z.string(),
  role: z.enum(CALENDAR_ROLES),
  text: z.string(),
  createdAt: z.string(),
});

export interface DoorCommentsResponseDto {
  readonly comments: readonly DoorCommentDto[];
}

export const DoorCommentsResponseDtoSchema: z.ZodType<DoorCommentsResponseDto> = z.object({
  comments: z.array(DoorCommentDtoSchema),
});

/** A new comment; `author` only matters on a follower's link. */
export interface AddDoorCommentRequestDto {
  readonly author?: string;
  readonly text: string;
}

export const AddDoorCommentRequestDtoSchema: z.ZodType<AddDoorCommentRequestDto> = z.object({
  author: z.string().max(100).exactOptional(),
  text: z.string().max(2000),
});
