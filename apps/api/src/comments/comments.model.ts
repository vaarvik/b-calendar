import type {
  AddDoorComment,
  AddGiverDoorComment,
  ListAdminDoorComments,
  ListDoorComments,
  RemoveDoorComment,
} from '@b-calendar/contracts';

/** Everything about comments over HTTP. */
export interface CommentUseCases {
  readonly addDoorComment: AddDoorComment;
  readonly addGiverDoorComment: AddGiverDoorComment;
  readonly listDoorComments: ListDoorComments;
  readonly listAdminDoorComments: ListAdminDoorComments;
  readonly removeDoorComment: RemoveDoorComment;
}
