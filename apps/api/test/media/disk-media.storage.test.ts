import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeMediaStorageContract } from '@b-calendar/contracts/test-kit';
import { DiskMediaStorage } from '../../src/media/disk-media.storage.js';

describeMediaStorageContract('DiskMediaStorage', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'b-calendar-media-'));
  return {
    storage: new DiskMediaStorage({ directory: join(directory, 'media') }),
    read: async (url) => {
      try {
        return new Uint8Array(await readFile(join(directory, url)));
      } catch {
        return null;
      }
    },
    dispose: () => rm(directory, { recursive: true, force: true }),
  };
});
