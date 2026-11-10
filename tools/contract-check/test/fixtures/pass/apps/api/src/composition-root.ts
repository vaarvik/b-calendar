import { SearchPlacesUseCase } from '../../../packages/application/src/search-places.use-case.js';
import { PgPlaceReader } from './places/pg-place.reader.js';
import { PgPlaceWriter } from './places/pg-place.writer.js';

export class CompositionRoot {
  public readonly searchPlaces = new SearchPlacesUseCase(new PgPlaceReader());
  public readonly writer = new PgPlaceWriter();
}
