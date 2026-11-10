export interface PlaceReader {
  read(): void;
}

export class PgPlaceRepository implements PlaceReader {
  public read(): void {}
}

export class PgPlaceError extends Error {}
