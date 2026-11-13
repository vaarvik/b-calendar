import type { MediaContentType } from '@b-calendar/contracts';

/** One upload kept by InMemoryMediaStorage. */
export interface StoredMedia {
  readonly contentType: MediaContentType;
  readonly bytes: Uint8Array;
}
