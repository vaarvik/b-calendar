import { DoorDraftSchema } from '@b-calendar/contracts';
import type {
  CalendarReader,
  DoorPreview,
  DoorReader,
  DraftDoorPresenter,
  DraftDoorReader,
  DraftDoorWriter,
  EditDoor,
  EditDoorInput,
  InputValidator,
} from '@b-calendar/contracts';

export class EditDoorUseCase implements EditDoor {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly draftReader: DraftDoorReader,
    private readonly draftWriter: DraftDoorWriter,
    private readonly published: DoorReader,
    private readonly presenter: DraftDoorPresenter,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: EditDoorInput): Promise<DoorPreview> {
    const draft = this.validator.validate(DoorDraftSchema, input.draft);
    const existing = await this.draftReader.getById(input.doorId);
    await this.draftWriter.save({ ...existing, ...draft });
    const calendar = await this.calendars.getById(existing.calendarId);
    const [drafts, published] = await Promise.all([
      this.draftReader.listByCalendar(calendar.id),
      this.published.listByCalendar(calendar.id),
    ]);
    return this.presenter.presentOne(calendar, drafts, published, existing.id);
  }
}
