import { CommentAuthorSchema, CommentTextSchema } from '@b-calendar/contracts';
import type {
  AddDoorComment,
  AddDoorCommentInput,
  Clock,
  DoorComment,
  DoorCommentWriter,
  IdGenerator,
  InputValidator,
  OpenedDoorLocator,
} from '@b-calendar/contracts';

export class AddDoorCommentUseCase implements AddDoorComment {
  public constructor(
    private readonly doors: OpenedDoorLocator,
    private readonly comments: DoorCommentWriter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: AddDoorCommentInput): Promise<DoorComment> {
    const text = this.validator.validate(CommentTextSchema, input.text);
    const { viewer, door } = await this.doors.locate(input);
    const author =
      viewer.role === 'recipient'
        ? viewer.calendar.recipientName
        : this.validator.validate(CommentAuthorSchema, input.author ?? '');
    const comment: DoorComment = {
      id: this.ids.commentId(),
      doorId: door.id,
      author,
      role: viewer.role,
      text,
      createdAt: this.clock.now(),
    };
    await this.comments.create(comment);
    return comment;
  }
}
