import type { KeyValueStorage } from '../shared/shared.ports';
import type { CommenterNameStorage } from './calendars.ports';

/** One name per calendar, under `commenter:<slug>`. */
export class KeyValueCommenterNameStorage implements CommenterNameStorage {
  public constructor(private readonly storage: KeyValueStorage) {}

  public find(slug: string): string | null {
    return this.storage.get(`commenter:${slug}`);
  }

  public save(slug: string, name: string): void {
    this.storage.set(`commenter:${slug}`, name);
  }
}
