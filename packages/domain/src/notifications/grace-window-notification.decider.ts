import type { Door, NotificationDecider, NotificationDecision } from '@b-calendar/contracts';

export interface GraceWindowNotificationDeciderConfig {
  /** How long after a door opens its notification may still go out. */
  readonly graceMinutes: number;
}

/** Sends within a window after the door opens; later, skips. */
export class GraceWindowNotificationDecider implements NotificationDecider {
  public constructor(private readonly config: GraceWindowNotificationDeciderConfig) {}

  public decide(door: Door, now: Date): NotificationDecision {
    const late = now.getTime() - door.opensAt.getTime();
    if (door.notifiedAt !== null || late < 0) {
      return 'wait';
    }
    return late <= this.config.graceMinutes * 60_000 ? 'send' : 'skip';
  }
}
