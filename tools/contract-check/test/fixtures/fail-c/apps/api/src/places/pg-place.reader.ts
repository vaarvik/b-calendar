export interface PlaceReader {
  read(): void;
}

export class PgPlaceReader implements PlaceReader {
  public read(): void {}
}
