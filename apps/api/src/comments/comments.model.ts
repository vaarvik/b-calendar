import type {
  AddDoorComment,
  ListAdminDoorComments,
  ListDoorComments,
  RemoveDoorComment,
} from '@b-calendar/contracts';

/** Everything about comments over HTTP. */
export interface CommentUseCases {
  readonly addDoorComment: AddDoorComment;
  readonly listDoorComments: ListDoorComments;
  readonly listAdminDoorComments: ListAdminDoorComments;
  readonly removeDoorComment: RemoveDoorComment;
}
