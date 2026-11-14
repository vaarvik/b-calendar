import { DoorLockedError, NotFoundError } from '@b-calendar/contracts';
import type {
  CalendarAccess,
  CalendarAccessAuthenticator,
  CalendarViewer,
  Clock,
  Door,
  DoorReader,
  OpenedDoorLocator,
  RecipientDoorPresenter,
} from '@b-calendar/contracts';

/** A door by number, if the presenter shows it to her and its time has come. */
export class VisibleOpenedDoorLocator implements OpenedDoorLocator {
  public constructor(
    private readonly access: CalendarAccessAuthenticator,
    private readonly doors: DoorReader,
    private readonly presenter: RecipientDoorPresenter,
    private readonly clock: Clock,
  ) {}

  public async locate(
    input: CalendarAccess & { readonly number: number },
  ): Promise<{ readonly viewer: CalendarViewer; readonly door: Door }> {
    const viewer = await this.access.authenticate(input);
    const doors = await this.doors.listByCalendar(viewer.calendar.id);
    const door = doors.find((candidate) => candidate.number === input.number);
    const shown = door === undefined ? null : this.presenter.present(door, this.clock.now());
    if (door === undefined || shown === null) {
      throw new NotFoundError('Door', String(input.number));
    }
    if (shown.state === 'locked') {
      throw new DoorLockedError(door.number, door.opensAt);
    }
    return { viewer, door };
  }
}
