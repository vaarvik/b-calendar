import { ConflictError } from '@b-calendar/contracts';
import type {
  Clock,
  DoorOpeningReader,
  DoorOpeningWriter,
  OpenDoor,
  OpenDoorInput,
  OpenDoorOutput,
  OpenedDoorLocator,
  RecipientDoorPresenter,
} from '@b-calendar/contracts';

export class OpenDoorUseCase implements OpenDoor {
  public constructor(
    private readonly doors: OpenedDoorLocator,
    private readonly openingReader: DoorOpeningReader,
    private readonly openingWriter: DoorOpeningWriter,
    private readonly presenter: RecipientDoorPresenter,
    private readonly clock: Clock,
  ) {}

  public async execute(input: OpenDoorInput): Promise<OpenDoorOutput> {
    const { viewer, door } = await this.doors.locate(input);
    // A member opens doors for themselves; a follower looks without leaving a trace.
    if (viewer.kind === 'member') {
      const opened = await this.openingReader.listByMember(viewer.member.id);
      if (!opened.some((opening) => opening.doorId === door.id)) {
        await this.openingWriter
          .create({ doorId: door.id, memberId: viewer.member.id, openedAt: this.clock.now() })
          .catch((error: unknown) => {
            // Two taps at once: the first one counts.
            if (!(error instanceof ConflictError)) {
              throw error;
            }
          });
      }
    }
    return {
      number: door.number,
      opensAt: door.opensAt,
      content: this.presenter.content(door.content),
    };
  }
}
