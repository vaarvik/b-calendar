import { DoorDraftSchema } from '@b-calendar/contracts';
import type {
  CalendarReader,
  Clock,
  Door,
  DoorPreview,
  DoorPreviewPresenter,
  DoorReader,
  DoorScheduleCalculator,
  DoorWriter,
  EditDoor,
  EditDoorInput,
  InputValidator,
} from '@b-calendar/contracts';

export class EditDoorUseCase implements EditDoor {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly reader: DoorReader,
    private readonly writer: DoorWriter,
    private readonly previews: DoorPreviewPresenter,
    private readonly schedule: DoorScheduleCalculator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: EditDoorInput): Promise<DoorPreview> {
    const draft = this.validator.validate(DoorDraftSchema, input.draft);
    const existing = await this.reader.getById(input.doorId);
    const calendar = await this.calendars.getById(existing.calendarId);
    const opensAt = this.schedule.opensAt(
      draft.opensOn,
      draft.openTime ?? calendar.defaultOpenTime,
      calendar.timeZone,
    );
    const inFuture = opensAt.getTime() > this.clock.now().getTime();
    const door: Door = {
      ...existing,
      ...draft,
      opensAt,
      notifiedAt: inFuture ? null : existing.notifiedAt,
    };
    await this.writer.save(door);
    return this.previews.preview(door);
  }
}
