import { UploadMediaUseCase } from '@b-calendar/application';
import { MAX_MEDIA_BYTES, ValidationError } from '@b-calendar/contracts';
import { InMemoryMediaStorage } from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { RandomIds } from '../shared/fakes.js';

async function* chunks(...sizes: number[]): AsyncIterable<Uint8Array> {
  for (const size of sizes) {
    await Promise.resolve();
    yield new Uint8Array(size);
  }
}

describe('UploadMedia', () => {
  const setup = () => {
    const storage = new InMemoryMediaStorage();
    return { storage, upload: new UploadMediaUseCase(storage, new RandomIds()) };
  };

  it.each([
    ['image/jpeg', 'image', 'jpg'],
    ['audio/mpeg', 'audio', 'mp3'],
    ['audio/x-m4a', 'audio', 'm4a'],
    ['video/quicktime', 'video', 'mov'],
  ])('stores %s as %s and gives its URL', async (contentType, kind, extension) => {
    const { upload } = setup();

    const output = await upload.execute({ contentType, chunks: chunks(2, 3) });

    expect(output.kind).toBe(kind);
    expect(output.url).toMatch(new RegExp(`^/media/[0-9a-f-]{36}\\.${extension}$`));
  });

  it('takes a video up to its limit, which is bigger than a photo’s', async () => {
    const { upload } = setup();

    await expect(
      upload.execute({ contentType: 'video/mp4', chunks: chunks(MAX_MEDIA_BYTES.image + 1) }),
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

    await expect(upload.execute({ contentType, chunks: chunks(...sizes) })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(storage.files.size).toBe(0);
  });
});
