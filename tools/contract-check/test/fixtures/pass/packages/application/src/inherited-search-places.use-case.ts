import { BaseUseCase } from './base.use-case.js';

export class InheritedSearchPlacesUseCase extends BaseUseCase {
  public override execute(): Promise<unknown> {
    return Promise.resolve(null);
  }
}
