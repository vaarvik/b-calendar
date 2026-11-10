export interface PlaceReader {
  getById(id: string): Promise<string>;
  nearby(): Promise<string[]>;
  listing(): Promise<string[]>;
}

export interface PlaceWriter {
  create(name: string): Promise<void>;
  attach(id: string): Promise<void>;
}

export interface PlaceFormatter {
  format(name: string): string;
}
