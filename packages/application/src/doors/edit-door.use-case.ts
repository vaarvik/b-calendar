import { DoorDraftSchema } from '@b-calendar/contracts';
import type {
  Clock,
  Door,
  DoorPreview,
  DoorPreviewPresenter,
  DoorReader,
  DoorWriter,
  EditDoor,
  EditDoorInput,
  InputValidator,
} from '@b-calendar/contracts';

export class EditDoorUseCase implements EditDoor {
  public constructor(
    private readonly reader: DoorReader,
    private readonly writer: DoorWriter,
    private readonly previews: DoorPreviewPresenter,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: EditDoorInput): Promise<DoorPreview> {
    const draft = this.validator.validate(DoorDraftSchema, input.draft);
    const existing = await this.reader.getById(input.doorId);
    const inFuture = draft.opensAt.getTime() > this.clock.now().getTime();
    const door: Door = { ...existing, ...draft, notifiedAt: inFuture ? null : existing.notifiedAt };
    await this.writer.save(door);
    return this.previews.preview(door);
  }
}
