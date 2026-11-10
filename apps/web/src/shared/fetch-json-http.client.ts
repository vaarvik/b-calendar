import { ApiError } from './shared.model';
import type { JsonHttpClient, JsonRequest } from './shared.ports';

export class FetchJsonHttpClient implements JsonHttpClient {
  public constructor(private readonly fetcher: typeof fetch) {}

  public async request<T>(request: JsonRequest<T>): Promise<T> {
    const isBlob = request.body instanceof Blob;
    const headers: Record<string, string> = { ...request.headers };
    if (request.body !== undefined && !isBlob) {
      headers['content-type'] = 'application/json';
    }
    if (isBlob && request.body.type !== '') {
      headers['content-type'] = request.body.type;
    }
    let response: Response;
    try {
      response = await this.fetcher(request.path, {
        method: request.method ?? 'GET',
        headers,
        cache: 'no-store',
        ...(request.body === undefined
          ? {}
          : { body: isBlob ? request.body : JSON.stringify(request.body) }),
      });
    } catch {
      throw new ApiError(0, 'network', 'No connection.');
    }
    const text = await response.text();
    const json: unknown = text === '' ? undefined : JSON.parse(text);
    if (!response.ok) {
      const error = (json as { error?: { code?: string; message?: string } } | undefined)?.error;
      throw new ApiError(
        response.status,
        error?.code ?? 'unknown',
        error?.message ?? response.statusText,
      );
    }
    return request.schema === undefined ? (undefined as T) : request.schema.parse(json);
  }
}
