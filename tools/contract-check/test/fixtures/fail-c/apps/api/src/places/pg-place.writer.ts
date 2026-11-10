export interface PlaceWriter {
  write(): void;
}

export class PgPlaceWriter implements PlaceWriter {
  public write(): void {}
}
