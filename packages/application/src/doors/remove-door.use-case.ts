import type { DoorId, DraftDoorWriter, RemoveDoor } from '@b-calendar/contracts';

export class RemoveDoorUseCase implements RemoveDoor {
  public constructor(private readonly drafts: DraftDoorWriter) {}

  public execute(input: { readonly doorId: DoorId }): Promise<void> {
    return this.drafts.remove(input.doorId);
  }
}
