import { CommentAuthorSchema, CommentTextSchema } from '@b-calendar/contracts';
import type {
  AddGiverDoorComment,
  AddGiverDoorCommentInput,
  CalendarReader,
  Clock,
  CommentNotifier,
  DoorComment,
  DoorCommentWriter,
  DoorReader,
  IdGenerator,
  InputValidator,
} from '@b-calendar/contracts';

export class AddGiverDoorCommentUseCase implements AddGiverDoorComment {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly doors: DoorReader,
    private readonly comments: DoorCommentWriter,
    private readonly notifier: CommentNotifier,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: AddGiverDoorCommentInput): Promise<DoorComment> {
    const author = this.validator.validate(CommentAuthorSchema, input.author);
    const text = this.validator.validate(CommentTextSchema, input.text);
    const door = await this.doors.getById(input.doorId);
    const now = this.clock.now();
    const comment: DoorComment = {
      id: this.ids.commentId(),
      doorId: door.id,
      author,
      role: 'giver',
      text,
      createdAt: now,
    };
    await this.comments.create(comment);
    // Before the door opens the comment waits quietly; a notification would give the door away.
    if (door.opensAt.getTime() <= now.getTime()) {
      const calendar = await this.calendars.getById(door.calendarId);
      await this.notifier.notify(calendar, door, comment, input.endpoint ?? null);
    }
    return comment;
  }
}
