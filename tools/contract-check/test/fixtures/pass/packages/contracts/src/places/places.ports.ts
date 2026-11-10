export interface PlaceReader {
  getById(id: string): Promise<unknown>;
}
export interface SearchPlaces {
  execute(input: { q: string }): Promise<unknown>;
}
export type PlaceId = string & { readonly __brand: 'PlaceId' };
