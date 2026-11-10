import { UploadImageUseCase } from '@b-calendar/application';
import { MAX_IMAGE_BYTES, ValidationError } from '@b-calendar/contracts';
import { InMemoryMediaStorage } from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { RandomIds } from '../shared/fakes.js';

describe('UploadImage', () => {
  const storage = new InMemoryMediaStorage();
  const upload = new UploadImageUseCase(storage, new RandomIds());

  it('stores an image and gives its URL', async () => {
    const { url } = await upload.execute({ contentType: 'image/jpeg', bytes: new Uint8Array([1]) });

    expect(url).toMatch(/^\/media\/[0-9a-f-]{36}\.jpg$/);
  });

  it.each([
    ['text/html', new Uint8Array([1])],
    ['image/png', new Uint8Array([])],
    ['image/png', new Uint8Array(MAX_IMAGE_BYTES + 1)],
  ])('refuses %s of %#', async (contentType, bytes) => {
    await expect(upload.execute({ contentType, bytes })).rejects.toBeInstanceOf(ValidationError);
  });
});
