import { ConflictError, NotFoundError } from '@b-calendar/contracts';
import type {
  CalendarId,
  Member,
  MemberId,
  MemberReader,
  MemberWriter,
} from '@b-calendar/contracts';

/** Members in a map. Copies on the way in and out, like a database would. */
export class InMemoryMemberRepository implements MemberReader, MemberWriter {
  private readonly rows = new Map<MemberId, Member>();

  public getById(id: MemberId): Promise<Member> {
    const member = this.rows.get(id);
    return member === undefined
      ? Promise.reject(new NotFoundError('Member', id))
      : Promise.resolve(structuredClone(member));
  }

  public listByCalendar(calendarId: CalendarId): Promise<Member[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((member) => member.calendarId === calendarId)
        .map((member) => structuredClone(member))
        .sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime()),
    );
  }

  public create(member: Member): Promise<void> {
    if (this.rows.has(member.id)) {
      return Promise.reject(new ConflictError(`Member ${member.id} exists.`));
    }
    this.rows.set(member.id, structuredClone(member));
    return Promise.resolve();
  }

  public save(member: Member): Promise<void> {
    if (!this.rows.has(member.id)) {
      return Promise.reject(new NotFoundError('Member', member.id));
    }
    this.rows.set(member.id, structuredClone(member));
    return Promise.resolve();
  }

  public remove(id: MemberId): Promise<void> {
    if (!this.rows.delete(id)) {
      return Promise.reject(new NotFoundError('Member', id));
    }
    return Promise.resolve();
  }
}
