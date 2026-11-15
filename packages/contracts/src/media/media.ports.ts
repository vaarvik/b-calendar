import type { CalendarOwnerId, MediaId } from '../shared/shared.model.js';
import type { MediaContentType, MediaFile } from './media.model.js';

/** Stores uploaded files and serves them under `/media/`. */
export interface MediaStorage {
  /**
   * Writes the file as its chunks arrive, so a video never has to fit in memory.
   *
   * @returns the path the file is served at, `/media/<file>`.
   * @throws whatever the chunks throw; the file is then not kept.
   */
  save(
    id: MediaId,
    contentType: MediaContentType,
    chunks: AsyncIterable<Uint8Array>,
  ): Promise<string>;
}

/** Reads the records of uploaded files. */
export interface MediaFileReader {
  /** The owner's files (null: uploads from before accounts), oldest first. */
  listByOwner(owner: CalendarOwnerId): Promise<MediaFile[]>;
}

/** Records uploaded files. */
export interface MediaFileWriter {
  /** @throws ConflictError when the id is taken. */
  create(file: MediaFile): Promise<void>;
}
