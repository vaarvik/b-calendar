import { IMAGE_TYPES } from '@b-calendar/contracts';
import type { ImageContentType, MediaId, MediaStorage } from '@b-calendar/contracts';
import type { StoredMedia } from './media.model.js';

/** Keeps uploads in memory, by file name. For tests and `STORAGE=memory`. */
export class InMemoryMediaStorage implements MediaStorage {
  public readonly files = new Map<string, StoredMedia>();

  public save(id: MediaId, contentType: ImageContentType, bytes: Uint8Array): Promise<string> {
    const file = `${id}.${IMAGE_TYPES[contentType]}`;
    this.files.set(file, { contentType, bytes: bytes.slice() });
    return Promise.resolve(`/media/${file}`);
  }
}
