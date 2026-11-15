import { describe, expect, it } from 'vitest';
import { ConflictError } from '../../src/index.js';
import type {
  AccountWriter,
  MediaFileReader,
  MediaFileWriter,
  MediaStorage,
} from '../../src/index.js';
import { FixtureHolder } from '../fixture.js';
import type { FixtureFactory } from '../fixture.js';
import { T0, TestData, hoursAfter } from '../test-data.js';

export interface MediaStorageFixture {
  readonly storage: MediaStorage;
  /** The bytes of a stored file, by its URL; null when nothing is kept there. */
  readonly read: (url: string) => Promise<Uint8Array | null>;
}

async function* chunks(...parts: number[][]): AsyncIterable<Uint8Array> {
  for (const part of parts) {
    await Promise.resolve();
    yield new Uint8Array(part);
  }
}

async function* failing(): AsyncIterable<Uint8Array> {
  await Promise.resolve();
  yield new Uint8Array([1, 2]);
  throw new Error('too big');
}

/** Behaviour every MediaStorage must have. */
export function describeMediaStorageContract(
  name: string,
  factory: FixtureFactory<MediaStorageFixture>,
): void {
  describe(`${name} satisfies MediaStorage`, () => {
    const fixture = new FixtureHolder(factory);

    it('stores the chunks as one file named by id and type, served under /media/', async () => {
      const id = new TestData().mediaId();

      const url = await fixture.current.storage.save(id, 'video/quicktime', chunks([1, 2], [3]));

      expect(url).toBe(`/media/${id}.mov`);
      await expect(fixture.current.read(url)).resolves.toEqual(new Uint8Array([1, 2, 3]));
    });

    it('keeps nothing and passes the error on when the chunks fail', async () => {
      const id = new TestData().mediaId();

      await expect(fixture.current.storage.save(id, 'audio/mpeg', failing())).rejects.toThrow(
        'too big',
      );
      await expect(fixture.current.read(`/media/${id}.mp3`)).resolves.toBeNull();
    });
  });
}

export interface MediaFileRepositoryFixture {
  readonly writer: MediaFileWriter;
  readonly reader: MediaFileReader;
  /** Owners must exist. */
  readonly accounts: AccountWriter;
}

/** Behaviour every MediaFileWriter and MediaFileReader pair must have. */
export function describeMediaFileRepositoryContract(
  name: string,
  factory: FixtureFactory<MediaFileRepositoryFixture>,
): void {
  describe(`${name} satisfies MediaFileReader and MediaFileWriter`, () => {
    const fixture = new FixtureHolder(factory);

    it('lists an owner’s files oldest first, and the unowned ones apart', async () => {
      const data = new TestData();
      const owner = data.account();
      await fixture.current.accounts.create(owner);
      const newer = data.mediaFile({
        ownerId: owner.id,
        contentType: 'video/quicktime',
        bytes: 95 * 1024 * 1024,
        createdAt: hoursAfter(T0, 1),
      });
      const older = data.mediaFile({ ownerId: owner.id });
      const unowned = data.mediaFile();
      for (const file of [newer, older, unowned]) {
        await fixture.current.writer.create(file);
      }

      await expect(fixture.current.reader.listByOwner(owner.id)).resolves.toEqual([older, newer]);
      await expect(fixture.current.reader.listByOwner(null)).resolves.toEqual([unowned]);
      await expect(fixture.current.reader.listByOwner(data.accountId())).resolves.toEqual([]);
    });

    it('refuses a taken id', async () => {
      const file = new TestData().mediaFile();
      await fixture.current.writer.create(file);

      await expect(fixture.current.writer.create(file)).rejects.toBeInstanceOf(ConflictError);
    });
  });
}
