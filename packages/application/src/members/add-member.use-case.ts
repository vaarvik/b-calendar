import { LimitExceededError, MemberNameSchema } from '@b-calendar/contracts';
import type {
  AccountLimits,
  AddMember,
  AddMemberInput,
  CalendarReader,
  Clock,
  IdGenerator,
  InputValidator,
  Member,
  MemberReader,
  MemberWriter,
  SecretGenerator,
} from '@b-calendar/contracts';

export class AddMemberUseCase implements AddMember {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly reader: MemberReader,
    private readonly members: MemberWriter,
    private readonly ids: IdGenerator,
    private readonly secrets: SecretGenerator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
    private readonly limits: AccountLimits,
  ) {}

  public async execute(input: AddMemberInput): Promise<Member> {
    const name = this.validator.validate(MemberNameSchema, input.name);
    const calendar = await this.calendars.getById(input.calendarId);
    const { membersPerCalendar } = this.limits;
    if ((await this.reader.listByCalendar(calendar.id)).length >= membersPerCalendar) {
      throw new LimitExceededError('membersPerCalendar', membersPerCalendar);
    }
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
