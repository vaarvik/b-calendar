import { MemberNameSchema } from '@b-calendar/contracts';
import type {
  AddMember,
  AddMemberInput,
  CalendarReader,
  Clock,
  IdGenerator,
  InputValidator,
  Member,
  MemberWriter,
  SecretGenerator,
} from '@b-calendar/contracts';

export class AddMemberUseCase implements AddMember {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly members: MemberWriter,
    private readonly ids: IdGenerator,
    private readonly secrets: SecretGenerator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: AddMemberInput): Promise<Member> {
    const name = this.validator.validate(MemberNameSchema, input.name);
    const calendar = await this.calendars.getById(input.calendarId);
    const member: Member = {
      id: this.ids.memberId(),
      calendarId: calendar.id,
      name,
      key: this.secrets.generate(),
      addedAt: this.clock.now(),
    };
    await this.members.create(member);
    return member;
  }
}
