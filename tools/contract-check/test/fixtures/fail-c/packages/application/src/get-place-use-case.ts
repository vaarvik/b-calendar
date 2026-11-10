export interface GetPlace {
  execute(): Promise<void>;
}

export class GetPlaceUseCase implements GetPlace {
  public execute(): Promise<void> {
    return Promise.resolve();
  }
}
