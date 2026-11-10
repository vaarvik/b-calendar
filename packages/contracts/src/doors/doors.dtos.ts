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
  readonly link: DoorLinkDto | null;
  readonly countdown: DoorCountdownDto | null;
  readonly confetti: boolean;
}

export const OpenDoorContentDtoSchema: z.ZodType<OpenDoorContentDto> = z.object({
  title: z.string(),
  message: z.string(),
  imageUrl: z.string().nullable(),
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

/** Everything about a door, for the admin. */
export interface DoorPreviewDto {
  readonly id: string;
  readonly number: number;
  readonly opensAt: string;
  readonly featured: boolean;
  readonly content: {
    readonly title: string;
    readonly message: string;
    readonly imageUrl: string | null;
    readonly linkUrl: string | null;
    readonly countdown: DoorCountdownDto | null;
    readonly confetti: boolean;
  };
  readonly link: DoorLinkDto | null;
  readonly notification: { readonly title: string; readonly body: string };
  readonly notifiedAt: string | null;
  readonly firstOpenedAt: string | null;
}

export const DoorPreviewDtoSchema: z.ZodType<DoorPreviewDto> = z.object({
  id: z.string(),
  number: z.int(),
  opensAt: z.string(),
  featured: z.boolean(),
  content: z.object({
    title: z.string(),
    message: z.string(),
    imageUrl: z.string().nullable(),
    linkUrl: z.string().nullable(),
    countdown: DoorCountdownDtoSchema.nullable(),
    confetti: z.boolean(),
  }),
  link: DoorLinkDtoSchema.nullable(),
  notification: z.object({ title: z.string(), body: z.string() }),
  notifiedAt: z.string().nullable(),
  firstOpenedAt: z.string().nullable(),
});
