export interface PlaceReader {
  read(): void;
}

export class InMemoryPlaceRepository implements PlaceReader {
  public read(): void {}
}
