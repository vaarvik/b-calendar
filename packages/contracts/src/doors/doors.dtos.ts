import { z } from 'zod';
import { DOOR_LINK_KINDS } from './doors.model.js';
import type { DoorLinkKind } from './doors.model.js';

export interface DoorLinkDto {
  readonly url: string;
  readonly kind: DoorLinkKind;
  readonly embedUrl: string | null;
}

export const DoorLinkDtoSchema: z.ZodType<DoorLinkDto> = z.object({
  url: z.string(),
  kind: z.enum(DOOR_LINK_KINDS),
  embedUrl: z.string().nullable(),
});

export interface DoorCountdownDto {
  readonly to: string;
  readonly label: string;
}

const DoorCountdownDtoSchema: z.ZodType<DoorCountdownDto> = z.object({
  to: z.string(),
  label: z.string(),
});

/** The content of an open door on the wire. */
export interface OpenDoorContentDto {
  readonly title: string;
  readonly message: string;
  readonly imageUrl: string | null;
  readonly secondImageUrl: string | null;
  readonly videoUrl: string | null;
  readonly audioUrl: string | null;
  readonly link: DoorLinkDto | null;
  readonly countdown: DoorCountdownDto | null;
  readonly confetti: boolean;
}

export const OpenDoorContentDtoSchema: z.ZodType<OpenDoorContentDto> = z.object({
  title: z.string(),
  message: z.string(),
  imageUrl: z.string().nullable(),
  secondImageUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  audioUrl: z.string().nullable(),
  link: DoorLinkDtoSchema.nullable(),
  countdown: DoorCountdownDtoSchema.nullable(),
  confetti: z.boolean(),
});

export type RecipientDoorDto =
  | {
      readonly state: 'locked' | 'ready';
      readonly number: number;
      readonly opensAt: string;
      readonly featured: boolean;
    }
  | {
      readonly state: 'opened';
      readonly number: number;
      readonly opensAt: string;
      readonly featured: boolean;
      readonly content: OpenDoorContentDto;
    };

export const RecipientDoorDtoSchema: z.ZodType<RecipientDoorDto> = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('locked'),
    number: z.int(),
    opensAt: z.string(),
    featured: z.boolean(),
  }),
  z.object({
    state: z.literal('ready'),
    number: z.int(),
    opensAt: z.string(),
    featured: z.boolean(),
  }),
  z.object({
    state: z.literal('opened'),
    number: z.int(),
    opensAt: z.string(),
    featured: z.boolean(),
    content: OpenDoorContentDtoSchema,
  }),
]);

export interface OpenDoorResponseDto {
  readonly number: number;
  readonly opensAt: string;
  readonly content: OpenDoorContentDto;
}

export const OpenDoorResponseDtoSchema: z.ZodType<OpenDoorResponseDto> = z.object({
  number: z.int(),
  opensAt: z.string(),
  content: OpenDoorContentDtoSchema,
});

export interface DoorOpeningDto {
  readonly memberId: string;
  readonly openedAt: string;
}

export const DoorOpeningDtoSchema: z.ZodType<DoorOpeningDto> = z.object({
  memberId: z.string(),
  openedAt: z.string(),
});

/** Everything about a door, for the admin. */
export interface DoorPreviewDto {
  readonly id: string;
  readonly number: number;
  readonly opensAt: string;
  readonly opensOn: string;
  readonly openTime: string | null;
  readonly featured: boolean;
  readonly hidden: boolean;
  readonly content: {
    readonly title: string;
    readonly message: string;
    readonly imageUrl: string | null;
    readonly secondImageUrl: string | null;
    readonly videoUrl: string | null;
    readonly audioUrl: string | null;
    readonly linkUrl: string | null;
    readonly countdown: DoorCountdownDto | null;
    readonly confetti: boolean;
  };
  readonly link: DoorLinkDto | null;
  readonly notification: { readonly title: string; readonly body: string };
  readonly notifiedAt: string | null;
  /** Who has opened it, first first. */
  readonly openings: readonly DoorOpeningDto[];
}

export const DoorPreviewDtoSchema: z.ZodType<DoorPreviewDto> = z.object({
  id: z.string(),
  number: z.int(),
  opensAt: z.string(),
  opensOn: z.string(),
  openTime: z.string().nullable(),
  featured: z.boolean(),
  hidden: z.boolean(),
  content: z.object({
    title: z.string(),
    message: z.string(),
    imageUrl: z.string().nullable(),
    secondImageUrl: z.string().nullable(),
    videoUrl: z.string().nullable(),
    audioUrl: z.string().nullable(),
    linkUrl: z.string().nullable(),
    countdown: DoorCountdownDtoSchema.nullable(),
    confetti: z.boolean(),
  }),
  link: DoorLinkDtoSchema.nullable(),
  notification: z.object({ title: z.string(), body: z.string() }),
  notifiedAt: z.string().nullable(),
  openings: z.array(DoorOpeningDtoSchema),
});
