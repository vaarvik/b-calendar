import { NotFoundError } from '@b-calendar/contracts';
import type {
  Calendar,
  Door,
  DoorId,
  DoorNumberCalculator,
  DoorPreview,
  DoorPreviewPresenter,
  DoorScheduleCalculator,
  DraftDoor,
  DraftDoorPresenter,
} from '@b-calendar/contracts';

/** Schedules the draft in the calendar's time zone, numbers it by date and adds her progress. */
export class NumberedDraftDoorPresenter implements DraftDoorPresenter {
  public constructor(
    private readonly schedule: DoorScheduleCalculator,
    private readonly numbering: DoorNumberCalculator,
    private readonly previews: DoorPreviewPresenter,
  ) {}

  public present(
    calendar: Calendar,
    drafts: readonly DraftDoor[],
    published: readonly Door[],
  ): DoorPreview[] {
    const progress = new Map(published.map((door) => [door.id, door]));
    const scheduled = drafts.map(({ addedAt, ...draft }) => ({
      draft,
      id: draft.id,
      addedAt,
      opensAt: this.schedule.opensAt(
        draft.opensOn,
        draft.openTime ?? calendar.defaultOpenTime,
        calendar.timeZone,
      ),
    }));
    return this.numbering.ordered(scheduled).map(({ draft, opensAt }, index) => {
      const live = progress.get(draft.id);
      return this.previews.preview({
        ...draft,
        number: index + 1,
        opensAt,
        notifiedAt: live?.notifiedAt ?? null,
        firstOpenedAt: live?.firstOpenedAt ?? null,
      });
    });
  }

  public presentOne(
    calendar: Calendar,
    drafts: readonly DraftDoor[],
    published: readonly Door[],
    id: DoorId,
  ): DoorPreview {
    const preview = this.present(calendar, drafts, published).find((door) => door.id === id);
    if (preview === undefined) {
      throw new NotFoundError('DraftDoor', id);
    }
    return preview;
  }
}
