import { NotFoundError } from '@b-calendar/contracts';
import type {
  CalendarId,
  Member,
  MemberId,
  MemberReader,
  MemberWriter,
} from '@b-calendar/contracts';
import type { Kysely, Selectable } from 'kysely';
import type { Database, MembersTable } from '../shared/shared.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

export class PgMemberRepository implements MemberReader, MemberWriter {
  public constructor(
    private readonly db: Kysely<Database>,
    private readonly errors: DatabaseErrorTranslator,
  ) {}

  public async getById(id: MemberId): Promise<Member> {
    const row = await this.db
      .selectFrom('members')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (row === undefined) {
      throw new NotFoundError('Member', id);
    }
    return this.toMember(row);
  }

  public async listByCalendar(calendarId: CalendarId): Promise<Member[]> {
    const rows = await this.db
      .selectFrom('members')
      .selectAll()
      .where('calendar_id', '=', calendarId)
      .orderBy('added_at')
      .orderBy('id')
      .execute();
    return rows.map((row) => this.toMember(row));
  }

  public async create(member: Member): Promise<void> {
    try {
      await this.db.insertInto('members').values(this.toRow(member)).execute();
    } catch (error) {
      throw this.errors.translate(error);
    }
  }

  public async save(member: Member): Promise<void> {
    const result = await this.db
      .updateTable('members')
      .set(this.toRow(member))
      .where('id', '=', member.id)
      .executeTakeFirst();
    if (result.numUpdatedRows === 0n) {
      throw new NotFoundError('Member', member.id);
    }
  }

  public async remove(id: MemberId): Promise<void> {
    const result = await this.db.deleteFrom('members').where('id', '=', id).executeTakeFirst();
    if (result.numDeletedRows === 0n) {
      throw new NotFoundError('Member', id);
    }
  }

  private toRow(member: Member): MembersTable {
    return {
      id: member.id,
      calendar_id: member.calendarId,
      name: member.name,
      key: member.key,
      added_at: member.addedAt,
    };
  }

  private toMember(row: Selectable<MembersTable>): Member {
    return {
      id: row.id as MemberId,
      calendarId: row.calendar_id as CalendarId,
      name: row.name,
      key: row.key,
      addedAt: row.added_at,
    };
  }
}
