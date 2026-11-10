import type { KeyValueStorage } from './shared.ports';

/** localStorage, which may be missing or throw (private mode); then nothing is remembered. */
export class LocalKeyValueStorage implements KeyValueStorage {
  public constructor(private readonly prefix: string) {}

  public get(key: string): string | null {
    try {
      return globalThis.localStorage.getItem(this.prefix + key);
    } catch {
      return null;
    }
  }

  public set(key: string, value: string): void {
    try {
      globalThis.localStorage.setItem(this.prefix + key, value);
    } catch {
      // Not remembered; the link still works.
    }
  }

  public remove(key: string): void {
    try {
      globalThis.localStorage.removeItem(this.prefix + key);
    } catch {
      // Nothing to forget.
    }
  }
}
