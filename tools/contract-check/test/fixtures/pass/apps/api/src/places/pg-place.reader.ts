import type { PlaceReader } from '../../../../packages/contracts/src/places/places.ports.js';

export class PgPlaceReader implements PlaceReader {
  public getById(): Promise<unknown> {
    return Promise.reject(new PgConnectionError('Errors may be constructed anywhere.'));
  }
}

export class PgConnectionError extends Error {}
