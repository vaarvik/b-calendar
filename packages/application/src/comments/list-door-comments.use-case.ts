import type {
  DoorComment,
  DoorCommentReader,
  DoorCommentsInput,
  ListDoorComments,
  OpenedDoorLocator,
} from '@b-calendar/contracts';

export class ListDoorCommentsUseCase implements ListDoorComments {
  public constructor(
    private readonly doors: OpenedDoorLocator,
    private readonly comments: DoorCommentReader,
  ) {}

  public async execute(input: DoorCommentsInput): Promise<DoorComment[]> {
    const { door } = await this.doors.locate(input);
    return this.comments.listByDoor(door.id);
  }
}
