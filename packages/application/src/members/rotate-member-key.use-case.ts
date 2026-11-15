import type {
  Member,
  MemberId,
  MemberReader,
  MemberWriter,
  RotateMemberKey,
  SecretGenerator,
} from '@b-calendar/contracts';

export class RotateMemberKeyUseCase implements RotateMemberKey {
  public constructor(
    private readonly reader: MemberReader,
    private readonly writer: MemberWriter,
    private readonly secrets: SecretGenerator,
  ) {}

  public async execute(input: { readonly memberId: MemberId }): Promise<Member> {
    const member = { ...(await this.reader.getById(input.memberId)), key: this.secrets.generate() };
    await this.writer.save(member);
    return member;
  }
}
