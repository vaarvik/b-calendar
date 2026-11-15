import type { AddMember, RemoveMember, RenameMember, RotateMemberKey } from '@b-calendar/contracts';

/** Everything about members over HTTP. */
export interface MemberUseCases {
  readonly addMember: AddMember;
  readonly renameMember: RenameMember;
  readonly rotateMemberKey: RotateMemberKey;
  readonly removeMember: RemoveMember;
}
