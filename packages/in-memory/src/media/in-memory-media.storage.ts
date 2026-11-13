import { MEDIA_TYPES } from '@b-calendar/contracts';
import type { MediaContentType, MediaId, MediaStorage } from '@b-calendar/contracts';
import type { StoredMedia } from './media.model.js';

/** Keeps uploads in memory, by file name. For tests and `STORAGE=memory`. */
export class InMemoryMediaStorage implements MediaStorage {
  public readonly files = new Map<string, StoredMedia>();

  public async save(
    id: MediaId,
    contentType: MediaContentType,
    chunks: AsyncIterable<Uint8Array>,
  ): Promise<string> {
    const parts: Uint8Array[] = [];
    for await (const chunk of chunks) {
      parts.push(chunk.slice());
    }
    const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    const file = `${id}.${MEDIA_TYPES[contentType].extension}`;
    this.files.set(file, { contentType, bytes });
    return `/media/${file}`;
  }
}
