import { z } from 'zod';

export interface MemberDto {
  readonly id: string;
  readonly name: string;
  readonly key: string;
  readonly addedAt: string;
}

export const MemberDtoSchema: z.ZodType<MemberDto> = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  addedAt: z.string(),
});

/** A new member, or a new name for one. */
export interface MemberNameRequestDto {
  readonly name: string;
}

export const MemberNameRequestDtoSchema: z.ZodType<MemberNameRequestDto> = z.object({
  name: z.string().max(100),
});
