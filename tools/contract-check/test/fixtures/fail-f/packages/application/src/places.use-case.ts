export interface UseCase {
  execute(): Promise<void>;
}

export class CreatePlaceUseCase implements UseCase {
  public execute(): Promise<void> {
    return Promise.resolve();
  }
}

export class UpdatePlaceUseCase implements UseCase {
  public execute(): Promise<void> {
    return Promise.resolve();
  }
}
