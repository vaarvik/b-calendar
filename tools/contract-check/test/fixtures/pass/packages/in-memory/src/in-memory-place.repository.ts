import type { PlaceReader } from '../../contracts/src/places/places.ports.js';

export class InMemoryPlaceRepository implements PlaceReader {
  public getById(): Promise<unknown> {
    return Promise.resolve(null);
  }
}
