import type { CalendarAccess } from '@b-calendar/contracts';
import type { KeyValueStorage } from '../shared/shared.ports';
import type { AccessKeyStorage } from './calendars.ports';

export class KeyValueAccessKeyStorage implements AccessKeyStorage {
  public constructor(private readonly storage: KeyValueStorage) {}

  public find(slug: string): string | null {
    return this.storage.get(`key:${slug}`);
  }

  public save(access: CalendarAccess): void {
    this.storage.set(`key:${access.slug}`, access.accessKey);
  }
}
