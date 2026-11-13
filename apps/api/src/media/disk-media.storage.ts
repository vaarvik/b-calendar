import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { MEDIA_TYPES } from '@b-calendar/contracts';
import type { MediaContentType, MediaId, MediaStorage } from '@b-calendar/contracts';

export interface DiskMediaStorageConfig {
  readonly directory: string;
}

/**
 * One file per upload, `<id>.<ext>`, in a directory that survives restarts (a volume). Written as
 * it arrives; a failed upload leaves no file behind.
 */
export class DiskMediaStorage implements MediaStorage {
  public constructor(private readonly config: DiskMediaStorageConfig) {}

  public async save(
    id: MediaId,
    contentType: MediaContentType,
    chunks: AsyncIterable<Uint8Array>,
  ): Promise<string> {
    const file = `${id}.${MEDIA_TYPES[contentType].extension}`;
    const path = join(this.config.directory, file);
    await mkdir(this.config.directory, { recursive: true });
    try {
      await pipeline(Readable.from(chunks), createWriteStream(path, { flags: 'wx' }));
    } catch (error) {
      await rm(path, { force: true });
      throw error;
    }
    return `/media/${file}`;
  }
}
