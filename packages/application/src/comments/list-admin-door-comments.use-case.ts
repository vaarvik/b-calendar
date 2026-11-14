import type {
  DoorComment,
  DoorCommentReader,
  DoorId,
  ListAdminDoorComments,
} from '@b-calendar/contracts';

export class ListAdminDoorCommentsUseCase implements ListAdminDoorComments {
  public constructor(private readonly comments: DoorCommentReader) {}

  public execute(input: { readonly doorId: DoorId }): Promise<DoorComment[]> {
    return this.comments.listByDoor(input.doorId);
  }
}
