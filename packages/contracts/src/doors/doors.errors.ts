import { DomainError } from '../shared/shared.errors.js';

/** The recipient tried to open a door before its time. */
export class DoorLockedError extends DomainError {
  public constructor(
    public readonly number: number,
    public readonly opensAt: Date,
    options?: ErrorOptions,
  ) {
    super('door_locked', `Door ${String(number)} opens ${opensAt.toISOString()}.`, options);
  }
}
