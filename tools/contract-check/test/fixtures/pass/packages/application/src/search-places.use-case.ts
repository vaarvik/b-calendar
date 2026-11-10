import type { PlaceReader, SearchPlaces } from '../../contracts/src/places/places.ports.js';

export class SearchPlacesUseCase implements SearchPlaces {
  public constructor(private readonly reader: PlaceReader) {}

  public execute(input: { q: string }): Promise<unknown> {
    return this.reader.getById(input.q);
  }
}

class NotExportedHelper {}
const helper = NotExportedHelper;
void helper;
