import { NotFoundError } from '@b-calendar/contracts';
import type { CalendarId, Door, DoorId, DoorReader, DoorWriter } from '@b-calendar/contracts';
import type { Kysely, Selectable } from 'kysely';
import type { Database, DoorsTable } from '../shared/shared.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

export class PgDoorRepository implements DoorReader, DoorWriter {
  public constructor(
    private readonly db: Kysely<Database>,
    private readonly errors: DatabaseErrorTranslator,
  ) {}

  public async getById(id: DoorId): Promise<Door> {
    const row = await this.db
      .selectFrom('doors')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (row === undefined) {
      throw new NotFoundError('Door', id);
    }
    return this.toDoor(row);
  }

  public async listByCalendar(calendarId: CalendarId): Promise<Door[]> {
    const rows = await this.db
      .selectFrom('doors')
      .selectAll()
      .where('calendar_id', '=', calendarId)
      .orderBy('number')
      .execute();
    return rows.map((row) => this.toDoor(row));
  }

  public async listUnnotified(at: Date): Promise<Door[]> {
    const rows = await this.db
      .selectFrom('doors')
      .selectAll()
      .where('notified_at', 'is', null)
      .where('opens_at', '<=', at)
      .orderBy('opens_at')
      .execute();
    return rows.map((row) => this.toDoor(row));
  }

  public async create(door: Door): Promise<void> {
    try {
      await this.db.insertInto('doors').values(this.toRow(door)).execute();
    } catch (error) {
      throw this.errors.translate(error);
    }
  }

  public async save(door: Door): Promise<void> {
    let updated: bigint;
    try {
      const result = await this.db
        .updateTable('doors')
        .set(this.toRow(door))
        .where('id', '=', door.id)
        .executeTakeFirst();
      updated = result.numUpdatedRows;
    } catch (error) {
      throw this.errors.translate(error);
    }
    if (updated === 0n) {
      throw new NotFoundError('Door', door.id);
    }
  }

  public async remove(id: DoorId): Promise<void> {
    const result = await this.db.deleteFrom('doors').where('id', '=', id).executeTakeFirst();
    if (result.numDeletedRows === 0n) {
      throw new NotFoundError('Door', id);
    }
  }

  private toRow(door: Door): DoorsTable {
    const { content, notification } = door;
    return {
      id: door.id,
      calendar_id: door.calendarId,
      number: door.number,
      opens_on: door.opensOn,
      open_time: door.openTime,
      opens_at: door.opensAt,
      featured: door.featured,
      hidden: door.hidden,
      title: content.title,
      message: content.message,
      image_url: content.imageUrl,
      link_url: content.linkUrl,
      countdown_to: content.countdown?.to ?? null,
      countdown_label: content.countdown?.label ?? null,
      confetti: content.confetti,
      notification_title: notification.title,
      notification_body: notification.body,
      notified_at: door.notifiedAt,
      first_opened_at: door.firstOpenedAt,
    };
  }

  private toDoor(row: Selectable<DoorsTable>): Door {
    return {
      id: row.id as DoorId,
      calendarId: row.calendar_id as CalendarId,
      number: row.number,
      opensOn: row.opens_on,
      openTime: row.open_time,
      opensAt: row.opens_at,
      featured: row.featured,
      hidden: row.hidden,
      content: {
        title: row.title,
        message: row.message,
        imageUrl: row.image_url,
        linkUrl: row.link_url,
        countdown:
          row.countdown_to === null
            ? null
            : { to: row.countdown_to, label: row.countdown_label ?? '' },
        confetti: row.confetti,
      },
      notification: { title: row.notification_title, body: row.notification_body },
      notifiedAt: row.notified_at,
      firstOpenedAt: row.first_opened_at,
    };
  }
}
