import type { PlaceId } from '../../contracts/src/places/places.ports.js';
import type { Policy } from './domain.ports.js';
import { NotFoundError } from '../../contracts/src/shared/shared.errors.js';

export class FixedPolicy implements Policy {
  public weightFor(id: PlaceId): number {
    if (id.length === 0) {
      throw new NotFoundError();
    }
    return 1;
  }
}

export interface FixedPolicyConfig {
  readonly weight: number;
}
