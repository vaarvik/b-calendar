import type { MediaId } from '@b-calendar/contracts';
import { InMemoryMediaStorage } from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';

describe('InMemoryMediaStorage', () => {
  it('stores a copy under the id and the type’s extension', async () => {
    const storage = new InMemoryMediaStorage();
    const bytes = new Uint8Array([1, 2, 3]);

    const url = await storage.save('abc' as MediaId, 'image/png', bytes);
    bytes[0] = 9;

    expect(url).toBe('/media/abc.png');
    expect(storage.files.get('abc.png')).toEqual({
      contentType: 'image/png',
      bytes: new Uint8Array([1, 2, 3]),
    });
  });
});
