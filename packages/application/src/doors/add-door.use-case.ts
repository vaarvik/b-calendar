import { DoorDraftSchema } from '@b-calendar/contracts';
import type {
  AddDoor,
  AddDoorInput,
  CalendarReader,
  Door,
  DoorPreview,
  DoorPreviewPresenter,
  DoorScheduleCalculator,
  DoorWriter,
  IdGenerator,
  InputValidator,
} from '@b-calendar/contracts';

export class AddDoorUseCase implements AddDoor {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly doors: DoorWriter,
    private readonly previews: DoorPreviewPresenter,
    private readonly schedule: DoorScheduleCalculator,
    private readonly ids: IdGenerator,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: AddDoorInput): Promise<DoorPreview> {
    const draft = this.validator.validate(DoorDraftSchema, input.draft);
    const calendar = await this.calendars.getById(input.calendarId);
    const door: Door = {
      ...draft,
      id: this.ids.doorId(),
      calendarId: calendar.id,
      opensAt: this.schedule.opensAt(
        draft.opensOn,
        draft.openTime ?? calendar.defaultOpenTime,
        calendar.timeZone,
      ),
      notifiedAt: null,
      firstOpenedAt: null,
    };
    await this.doors.create(door);
    return this.previews.preview(door);
  }
}
