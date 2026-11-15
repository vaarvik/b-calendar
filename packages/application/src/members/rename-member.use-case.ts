import { MemberNameSchema } from '@b-calendar/contracts';
import type {
  InputValidator,
  Member,
  MemberReader,
  MemberWriter,
  RenameMember,
  RenameMemberInput,
} from '@b-calendar/contracts';

export class RenameMemberUseCase implements RenameMember {
  public constructor(
    private readonly reader: MemberReader,
    private readonly writer: MemberWriter,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: RenameMemberInput): Promise<Member> {
    const name = this.validator.validate(MemberNameSchema, input.name);
    const member = { ...(await this.reader.getById(input.memberId)), name };
    await this.writer.save(member);
    return member;
  }
}
