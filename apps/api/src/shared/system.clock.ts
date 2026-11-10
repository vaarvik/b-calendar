import type { Clock } from '@b-calendar/contracts';

export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}
