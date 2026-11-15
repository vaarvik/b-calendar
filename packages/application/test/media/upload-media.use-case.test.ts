import { UploadMediaUseCase } from '@b-calendar/application';
import { LimitExceededError, MAX_MEDIA_BYTES, ValidationError } from '@b-calendar/contracts';
import { T0, TestData } from '@b-calendar/contracts/test-kit';
import { InMemoryMediaFileRepository, InMemoryMediaStorage } from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { ManualClock, RandomIds } from '../shared/fakes.js';

async function* chunks(...sizes: number[]): AsyncIterable<Uint8Array> {
  for (const size of sizes) {
    await Promise.resolve();
    yield new Uint8Array(size);
  }
}

describe('UploadMedia', () => {
  const setup = (mediaBytes = 200 * 1024 * 1024) => {
    const storage = new InMemoryMediaStorage();
    const files = new InMemoryMediaFileRepository();
    return {
      storage,
      files,
      upload: new UploadMediaUseCase(storage, files, files, new RandomIds(), new ManualClock(), {
        calendars: 1,
        membersPerCalendar: 1,
        mediaBytes,
      }),
    };
  };

  it.each([
    ['image/jpeg', 'image', 'jpg'],
    ['audio/mpeg', 'audio', 'mp3'],
    ['audio/x-m4a', 'audio', 'm4a'],
    ['video/quicktime', 'video', 'mov'],
  ])('stores %s as %s and gives its URL', async (contentType, kind, extension) => {
    const { upload } = setup();

    const output = await upload.execute({ owner: null, contentType, chunks: chunks(2, 3) });

    expect(output.kind).toBe(kind);
    expect(output.url).toMatch(new RegExp(`^/media/[0-9a-f-]{36}\\.${extension}$`));
  });

  it('takes a video up to its limit, which is bigger than a photo’s', async () => {
    const { upload } = setup();

    await expect(
      upload.execute({
        owner: null,
        contentType: 'video/mp4',
        chunks: chunks(MAX_MEDIA_BYTES.image + 1),
      }),
    ).resolves.toMatchObject({ kind: 'video' });
  });

  it.each([
    ['an unsupported type', 'text/html', [1]],
    ['an empty file', 'image/png', []],
    ['a photo over its limit', 'image/png', [MAX_MEDIA_BYTES.image, 1]],
    ['a song over its limit', 'audio/mpeg', [MAX_MEDIA_BYTES.audio + 1]],
    ['a video over its limit', 'video/mp4', [MAX_MEDIA_BYTES.video, 1]],
  ])('refuses %s and keeps nothing', async (_case, contentType, sizes) => {
    const { upload, storage } = setup();

    await expect(
      upload.execute({ owner: null, contentType, chunks: chunks(...sizes) }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(storage.files.size).toBe(0);
  });

  it('records whose upload it is and how big, and stops at the owner’s limit', async () => {
    const { upload, files, storage } = setup(10);
    const owner = new TestData().accountId();

    await upload.execute({ owner, contentType: 'image/png', chunks: chunks(4, 2) });

    await expect(files.listByOwner(owner)).resolves.toEqual([
      expect.objectContaining({
        ownerId: owner,
        contentType: 'image/png',
        bytes: 6,
        createdAt: T0,
      }),
    ]);
    // 4 bytes left: a 5-byte file breaks off while it streams, and nothing of it is kept.
    await expect(
      upload.execute({ owner, contentType: 'image/png', chunks: chunks(3, 2) }),
    ).rejects.toBeInstanceOf(LimitExceededError);
    expect(storage.files.size).toBe(1);
    await upload.execute({ owner, contentType: 'image/png', chunks: chunks(4) });
    await expect(
      upload.execute({ owner, contentType: 'image/png', chunks: chunks(1) }),
    ).rejects.toBeInstanceOf(LimitExceededError);
    // Someone else's uploads count for them alone.
    await expect(
      upload.execute({ owner: null, contentType: 'image/png', chunks: chunks(5) }),
    ).resolves.toMatchObject({ kind: 'image' });
  });
});
