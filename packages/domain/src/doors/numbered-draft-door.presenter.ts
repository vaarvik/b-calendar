import { NotFoundError } from '@b-calendar/contracts';
import type {
  Calendar,
  DoorId,
  DoorNumberCalculator,
  DoorPreview,
  DoorPreviewPresenter,
  DoorProgress,
  DoorScheduleCalculator,
  DraftDoor,
  DraftDoorPresenter,
} from '@b-calendar/contracts';

/** Schedules the draft in the calendar's time zone, numbers it by date and adds the progress. */
export class NumberedDraftDoorPresenter implements DraftDoorPresenter {
  public constructor(
    private readonly schedule: DoorScheduleCalculator,
    private readonly numbering: DoorNumberCalculator,
    private readonly previews: DoorPreviewPresenter,
  ) {}

  public present(
    calendar: Calendar,
    drafts: readonly DraftDoor[],
    progress: DoorProgress,
  ): DoorPreview[] {
    const published = new Map(progress.published.map((door) => [door.id, door]));
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
      return this.previews.preview(
        {
          ...draft,
          number: index + 1,
          opensAt,
          notifiedAt: published.get(draft.id)?.notifiedAt ?? null,
        },
        progress.openings,
      );
    });
  }

  public presentOne(
    calendar: Calendar,
    drafts: readonly DraftDoor[],
    progress: DoorProgress,
    id: DoorId,
  ): DoorPreview {
    const preview = this.present(calendar, drafts, progress).find((door) => door.id === id);
    if (preview === undefined) {
      throw new NotFoundError('DraftDoor', id);
    }
    return preview;
  }
}
