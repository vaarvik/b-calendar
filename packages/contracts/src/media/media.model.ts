import type { CalendarOwnerId, MediaId } from '../shared/shared.model.js';

/** What an upload is for: a door's photo, its song or its video. */
export const MEDIA_KINDS = ['image', 'audio', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

/** Types the recipient's phone can show or play, with their file extension. */
export const MEDIA_TYPES = {
  'image/jpeg': { kind: 'image', extension: 'jpg' },
  'image/png': { kind: 'image', extension: 'png' },
  'image/webp': { kind: 'image', extension: 'webp' },
  'image/gif': { kind: 'image', extension: 'gif' },
  'image/heic': { kind: 'image', extension: 'heic' },
  'audio/mpeg': { kind: 'audio', extension: 'mp3' },
  'audio/mp4': { kind: 'audio', extension: 'm4a' },
  'audio/x-m4a': { kind: 'audio', extension: 'm4a' },
  'audio/aac': { kind: 'audio', extension: 'aac' },
  'video/mp4': { kind: 'video', extension: 'mp4' },
  'video/quicktime': { kind: 'video', extension: 'mov' },
} as const satisfies Readonly<
  Record<string, { readonly kind: MediaKind; readonly extension: string }>
>;

export type MediaContentType = keyof typeof MEDIA_TYPES;

/** An uploaded file's record: whose it is and how big, for the owner's upload limit. */
export interface MediaFile {
  readonly id: MediaId;
  readonly ownerId: CalendarOwnerId;
  readonly contentType: MediaContentType;
  readonly bytes: number;
  readonly createdAt: Date;
}

const MB = 1024 * 1024;

/**
 * The largest upload of each kind. Photos are a few MB; a song fits in 25 MB; a video stays under
 * the 100 MB a Cloudflare tunnel lets through (about a minute or two of iPhone 1080p).
 */
export const MAX_MEDIA_BYTES: Readonly<Record<MediaKind, number>> = {
  image: 15 * MB,
  audio: 25 * MB,
  video: 95 * MB,
};
