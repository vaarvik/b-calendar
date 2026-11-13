import type { DoorNumberCalculator, DoorOrderKey } from '@b-calendar/contracts';

/** Door 1 opens first. Ties go to the door added first, then to the lower id. */
export class OpensAtDoorNumberCalculator implements DoorNumberCalculator {
  public ordered<T extends DoorOrderKey>(doors: readonly T[]): T[] {
    return [...doors].sort(
      (a, b) =>
        a.opensAt.getTime() - b.opensAt.getTime() ||
        a.addedAt.getTime() - b.addedAt.getTime() ||
        a.id.localeCompare(b.id),
    );
  }
}
