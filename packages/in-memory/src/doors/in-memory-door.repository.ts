import { ConflictError, NotFoundError } from '@b-calendar/contracts';
import type { CalendarId, Door, DoorId, DoorReader, DoorWriter } from '@b-calendar/contracts';

/** Doors in a map. Copies on the way in and out, like a database would. */
export class InMemoryDoorRepository implements DoorReader, DoorWriter {
  private readonly rows = new Map<DoorId, Door>();

  public getById(id: DoorId): Promise<Door> {
    const row = this.rows.get(id);
    return row === undefined
      ? Promise.reject(new NotFoundError('Door', id))
      : Promise.resolve(structuredClone(row));
  }

  public listByCalendar(calendarId: CalendarId): Promise<Door[]> {
    return Promise.resolve(
      this.all()
        .filter((door) => door.calendarId === calendarId)
        .sort((a, b) => a.number - b.number),
    );
  }

  public listUnnotified(at: Date): Promise<Door[]> {
    return Promise.resolve(
      this.all()
        .filter((door) => door.notifiedAt === null && door.opensAt.getTime() <= at.getTime())
        .sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime()),
    );
  }

  public create(door: Door): Promise<void> {
    if (this.rows.has(door.id)) {
      return Promise.reject(new ConflictError(`Door ${door.id} exists.`));
    }
    this.rows.set(door.id, structuredClone(door));
    return Promise.resolve();
  }

  public save(door: Door): Promise<void> {
    if (!this.rows.has(door.id)) {
      return Promise.reject(new NotFoundError('Door', door.id));
    }
    this.rows.set(door.id, structuredClone(door));
    return Promise.resolve();
  }

  public remove(id: DoorId): Promise<void> {
    if (!this.rows.delete(id)) {
      return Promise.reject(new NotFoundError('Door', id));
    }
    return Promise.resolve();
  }

  private all(): Door[] {
    return [...this.rows.values()].map((row) => structuredClone(row));
  }
}
