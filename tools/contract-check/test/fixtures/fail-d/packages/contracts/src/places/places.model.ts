export interface Place {
  readonly name: string;
}

export class PlaceDto implements Place {
  public constructor(public readonly name: string) {}
}

export const Factory = class {};
