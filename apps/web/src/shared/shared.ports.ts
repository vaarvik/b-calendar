import type { z } from 'zod';

export interface JsonRequest<T> {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  /** JSON-encoded unless it is a Blob, which is sent as it is with its own type. */
  readonly body?: unknown;
  /** Parses the response; omit for empty responses. */
  readonly schema?: z.ZodType<T>;
}

/** Talks to the API on the app's own origin. */
export interface JsonHttpClient {
  /** @throws ApiError for any non-2xx response or a network failure. */
  request<T>(request: JsonRequest<T>): Promise<T>;
}

/** Small strings that survive a reload (localStorage). Never throws. */
export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}
