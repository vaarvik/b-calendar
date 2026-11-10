import type { ImageContentType } from '@b-calendar/contracts';

/** One upload kept by InMemoryMediaStorage. */
export interface StoredMedia {
  readonly contentType: ImageContentType;
  readonly bytes: Uint8Array;
}
