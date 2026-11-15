import type { MemberId, MemberWriter, RemoveMember } from '@b-calendar/contracts';

export class RemoveMemberUseCase implements RemoveMember {
  public constructor(private readonly members: MemberWriter) {}

  public execute(input: { readonly memberId: MemberId }): Promise<void> {
    return this.members.remove(input.memberId);
  }
}
