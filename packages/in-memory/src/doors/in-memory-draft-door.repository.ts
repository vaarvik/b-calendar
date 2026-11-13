import { ConflictError, NotFoundError } from '@b-calendar/contracts';
import type {
  CalendarId,
  DoorId,
  DraftDoor,
  DraftDoorReader,
  DraftDoorWriter,
} from '@b-calendar/contracts';

/** Draft doors in a map. Copies on the way in and out, like a database would. */
export class InMemoryDraftDoorRepository implements DraftDoorReader, DraftDoorWriter {
  private readonly rows = new Map<DoorId, DraftDoor>();

  public getById(id: DoorId): Promise<DraftDoor> {
    const row = this.rows.get(id);
    return row === undefined
      ? Promise.reject(new NotFoundError('DraftDoor', id))
      : Promise.resolve(structuredClone(row));
  }

  public listByCalendar(calendarId: CalendarId): Promise<DraftDoor[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((door) => door.calendarId === calendarId)
        .map((door) => structuredClone(door))
        .sort(
          (a, b) => a.opensOn.localeCompare(b.opensOn) || a.addedAt.getTime() - b.addedAt.getTime(),
        ),
    );
  }

  public create(door: DraftDoor): Promise<void> {
    if (this.rows.has(door.id)) {
      return Promise.reject(new ConflictError(`Draft door ${door.id} exists.`));
    }
    this.rows.set(door.id, structuredClone(door));
    return Promise.resolve();
  }

  public save(door: DraftDoor): Promise<void> {
    if (!this.rows.has(door.id)) {
      return Promise.reject(new NotFoundError('DraftDoor', door.id));
    }
    this.rows.set(door.id, structuredClone(door));
    return Promise.resolve();
  }

  public remove(id: DoorId): Promise<void> {
    if (!this.rows.delete(id)) {
      return Promise.reject(new NotFoundError('DraftDoor', id));
    }
    return Promise.resolve();
  }
}
