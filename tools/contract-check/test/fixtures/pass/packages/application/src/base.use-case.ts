import type { SearchPlaces } from '../../contracts/src/places/places.ports.js';

export abstract class BaseUseCase implements SearchPlaces {
  public abstract execute(input: { q: string }): Promise<unknown>;
}
