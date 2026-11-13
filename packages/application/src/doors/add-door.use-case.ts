import { DoorDraftSchema } from '@b-calendar/contracts';
import type {
  AddDoor,
  AddDoorInput,
  CalendarReader,
  Clock,
  DoorPreview,
  DoorReader,
  DraftDoor,
  DraftDoorPresenter,
  DraftDoorReader,
  DraftDoorWriter,
  IdGenerator,
  InputValidator,
} from '@b-calendar/contracts';

export class AddDoorUseCase implements AddDoor {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly draftReader: DraftDoorReader,
    private readonly draftWriter: DraftDoorWriter,
    private readonly published: DoorReader,
    private readonly presenter: DraftDoorPresenter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: AddDoorInput): Promise<DoorPreview> {
    const draft = this.validator.validate(DoorDraftSchema, input.draft);
    const calendar = await this.calendars.getById(input.calendarId);
    const door: DraftDoor = {
      ...draft,
      id: this.ids.doorId(),
      calendarId: calendar.id,
      addedAt: this.clock.now(),
    };
    await this.draftWriter.create(door);
    const [drafts, published] = await Promise.all([
      this.draftReader.listByCalendar(calendar.id),
      this.published.listByCalendar(calendar.id),
    ]);
    return this.presenter.presentOne(calendar, drafts, published, door.id);
  }
}
