import type { MediaId } from '../shared/shared.model.js';
import type { ImageContentType } from './media.model.js';

/** Stores uploaded files and serves them under `/media/`. */
export interface MediaStorage {
  /** @returns the path the file is served at, `/media/<file>`. */
  save(id: MediaId, contentType: ImageContentType, bytes: Uint8Array): Promise<string>;
}
