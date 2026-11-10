/** Image types the recipient's browser can show, by file extension. */
export const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
} as const satisfies Readonly<Record<string, string>>;

export type ImageContentType = keyof typeof IMAGE_TYPES;

/** Phone photos are a few MB; this leaves room. */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
