import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { IMAGE_TYPES } from '@b-calendar/contracts';
import type { ImageContentType, MediaId, MediaStorage } from '@b-calendar/contracts';

export interface DiskMediaStorageConfig {
  readonly directory: string;
}

/** One file per upload, `<id>.<ext>`, in a directory that survives restarts (a volume). */
export class DiskMediaStorage implements MediaStorage {
  public constructor(private readonly config: DiskMediaStorageConfig) {}

  public async save(
    id: MediaId,
    contentType: ImageContentType,
    bytes: Uint8Array,
  ): Promise<string> {
    const file = `${id}.${IMAGE_TYPES[contentType]}`;
    await mkdir(this.config.directory, { recursive: true });
    await writeFile(join(this.config.directory, file), bytes, { flag: 'wx' });
    return `/media/${file}`;
  }
}
