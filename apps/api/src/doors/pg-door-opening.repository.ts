import type {
  CalendarId,
  DoorId,
  DoorOpening,
  DoorOpeningReader,
  DoorOpeningWriter,
  MemberId,
} from '@b-calendar/contracts';
import type { Kysely, Selectable } from 'kysely';
import type { Database, DoorOpeningsTable } from '../shared/shared.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

export class PgDoorOpeningRepository implements DoorOpeningReader, DoorOpeningWriter {
  public constructor(
    private readonly db: Kysely<Database>,
    private readonly errors: DatabaseErrorTranslator,
  ) {}

  public async listByMember(memberId: MemberId): Promise<DoorOpening[]> {
    const rows = await this.db
      .selectFrom('door_openings')
      .selectAll()
      .where('member_id', '=', memberId)
      .orderBy('opened_at')
      .orderBy('door_id')
      .execute();
    return rows.map((row) => this.toOpening(row));
  }

  public async listByCalendar(calendarId: CalendarId): Promise<DoorOpening[]> {
    const rows = await this.db
      .selectFrom('door_openings')
      .innerJoin('doors', 'doors.id', 'door_openings.door_id')
      .selectAll('door_openings')
      .where('doors.calendar_id', '=', calendarId)
      .orderBy('door_openings.opened_at')
      .orderBy('door_openings.member_id')
      .execute();
    return rows.map((row) => this.toOpening(row));
  }

  public async create(opening: DoorOpening): Promise<void> {
    try {
      await this.db
        .insertInto('door_openings')
        .values({
          door_id: opening.doorId,
          member_id: opening.memberId,
          opened_at: opening.openedAt,
        })
        .execute();
    } catch (error) {
      throw this.errors.translate(error);
    }
  }

  private toOpening(row: Selectable<DoorOpeningsTable>): DoorOpening {
    return {
      doorId: row.door_id as DoorId,
      memberId: row.member_id as MemberId,
      openedAt: row.opened_at,
    };
  }
}
