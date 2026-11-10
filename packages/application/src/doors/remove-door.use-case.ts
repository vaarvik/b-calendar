import type { DoorId, DoorWriter, RemoveDoor } from '@b-calendar/contracts';

export class RemoveDoorUseCase implements RemoveDoor {
  public constructor(private readonly doors: DoorWriter) {}

  public execute(input: { readonly doorId: DoorId }): Promise<void> {
    return this.doors.remove(input.doorId);
  }
}
