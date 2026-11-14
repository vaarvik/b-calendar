import type { CommentId, DoorCommentWriter, RemoveDoorComment } from '@b-calendar/contracts';

export class RemoveDoorCommentUseCase implements RemoveDoorComment {
  public constructor(private readonly comments: DoorCommentWriter) {}

  public execute(input: { readonly commentId: CommentId }): Promise<void> {
    return this.comments.remove(input.commentId);
  }
}
