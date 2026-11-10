import type { PlaceId } from '../../contracts/src/places/places.ports.js';

export interface Policy {
  weightFor(id: PlaceId): number;
}
