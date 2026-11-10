import type { Clock } from './shared.ports.js';

export class WebClock implements Clock {
  public now(): Date {
    return new Date();
  }
}
