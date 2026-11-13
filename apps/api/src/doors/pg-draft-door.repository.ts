import { NotFoundError } from '@b-calendar/contracts';
import type {
  CalendarId,
  DoorId,
  DraftDoor,
  DraftDoorReader,
  DraftDoorWriter,
} from '@b-calendar/contracts';
import type { Kysely, Selectable } from 'kysely';
import type { Database, DoorDraftsTable } from '../shared/shared.model.js';
import { DoorDraftRowSchema } from './doors.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

export class PgDraftDoorRepository implements DraftDoorReader, DraftDoorWriter {
  public constructor(
    private readonly db: Kysely<Database>,
    private readonly errors: DatabaseErrorTranslator,
  ) {}

  public async getById(id: DoorId): Promise<DraftDoor> {
    const row = await this.db
      .selectFrom('door_drafts')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (row === undefined) {
      throw new NotFoundError('DraftDoor', id);
    }
    return this.toDraftDoor(row);
  }

  public async listByCalendar(calendarId: CalendarId): Promise<DraftDoor[]> {
    const rows = await this.db
      .selectFrom('door_drafts')
      .selectAll()
      .where('calendar_id', '=', calendarId)
      .orderBy('opens_on')
      .orderBy('added_at')
      .execute();
    return rows.map((row) => this.toDraftDoor(row));
  }

  public async create(door: DraftDoor): Promise<void> {
    try {
      await this.db.insertInto('door_drafts').values(this.toRow(door)).execute();
    } catch (error) {
      throw this.errors.translate(error);
    }
  }

  public async save(door: DraftDoor): Promise<void> {
    const result = await this.db
      .updateTable('door_drafts')
      .set(this.toRow(door))
      .where('id', '=', door.id)
      .executeTakeFirst();
    if (result.numUpdatedRows === 0n) {
      throw new NotFoundError('DraftDoor', door.id);
    }
  }

  public async remove(id: DoorId): Promise<void> {
    const result = await this.db.deleteFrom('door_drafts').where('id', '=', id).executeTakeFirst();
    if (result.numDeletedRows === 0n) {
      throw new NotFoundError('DraftDoor', id);
    }
  }

  private toRow(door: DraftDoor) {
    const { id, calendarId, addedAt, ...draft } = door;
    return {
      id,
      calendar_id: calendarId,
      opens_on: draft.opensOn,
      added_at: addedAt,
      draft: JSON.stringify(draft),
    };
  }

  private toDraftDoor(row: Selectable<DoorDraftsTable>): DraftDoor {
    return {
      ...DoorDraftRowSchema.parse(row.draft),
      id: row.id as DoorId,
      calendarId: row.calendar_id as CalendarId,
      addedAt: row.added_at,
    };
  }
}
