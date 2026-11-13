import { DoorLockedError, NotFoundError } from '@b-calendar/contracts';
import type {
  CalendarAccessAuthenticator,
  Clock,
  DoorReader,
  DoorWriter,
  OpenDoor,
  OpenDoorInput,
  OpenDoorOutput,
  RecipientDoorPresenter,
} from '@b-calendar/contracts';

export class OpenDoorUseCase implements OpenDoor {
  public constructor(
    private readonly access: CalendarAccessAuthenticator,
    private readonly reader: DoorReader,
    private readonly writer: DoorWriter,
    private readonly presenter: RecipientDoorPresenter,
    private readonly clock: Clock,
  ) {}

  public async execute(input: OpenDoorInput): Promise<OpenDoorOutput> {
    const { calendar, role } = await this.access.authenticate(input);
    const doors = await this.reader.listByCalendar(calendar.id);
    const door = doors.find((candidate) => candidate.number === input.number);
    const now = this.clock.now();
    const shown = door === undefined ? null : this.presenter.present(door, now);
    if (door === undefined || shown === null) {
      throw new NotFoundError('Door', String(input.number));
    }
    if (shown.state === 'locked') {
      throw new DoorLockedError(door.number, door.opensAt);
    }
    // Only she opens doors for real; a follower looks without leaving a trace.
    if (door.firstOpenedAt === null && role === 'recipient') {
      await this.writer.save({ ...door, firstOpenedAt: now });
    }
    return {
      number: door.number,
      opensAt: door.opensAt,
      content: this.presenter.content(door.content),
    };
  }
}
