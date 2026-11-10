import { PgPlaceReader as Reader } from './pg-place.reader.js';
import { GetPlaceUseCase } from '../../../../packages/application/src/index.js';
import { SystemClock } from '../shared/system.clock.js';

export interface HttpController {
  register(): void;
}

export class PlacesController implements HttpController {
  public register(): void {
    const reader = new Reader();
    const useCase = new GetPlaceUseCase();
    const clock = new SystemClock();
    void reader;
    void useCase;
    void clock;
  }
}
