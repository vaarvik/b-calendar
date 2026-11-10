import { GetPlaceUseCase } from './get-place-use-case.js';
import type { GetPlace } from './get-place-use-case.js';

export class CreatePlaceUseCase implements GetPlace {
  private readonly inner = new GetPlaceUseCase();

  public execute(): Promise<void> {
    return this.inner.execute();
  }
}
