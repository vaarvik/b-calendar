import { WebClock } from './shared/web.clock.js';

export interface Adapters {
  readonly clock: WebClock;
}

export class CurrentPlatform implements Adapters {
  public readonly clock = new WebClock();
}
