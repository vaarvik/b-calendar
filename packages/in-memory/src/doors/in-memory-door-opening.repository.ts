import { ConflictError } from '@b-calendar/contracts';
import type {
  CalendarId,
  DoorOpening,
  DoorOpeningReader,
  DoorOpeningWriter,
  DoorReader,
  MemberId,
} from '@b-calendar/contracts';

/** Openings in a list. Finds a calendar's through its doors, like a join would. */
export class InMemoryDoorOpeningRepository implements DoorOpeningReader, DoorOpeningWriter {
  private readonly rows: DoorOpening[] = [];

  public constructor(private readonly doors: DoorReader) {}

  public listByMember(memberId: MemberId): Promise<DoorOpening[]> {
    return Promise.resolve(this.sorted(this.rows.filter((row) => row.memberId === memberId)));
  }

  public async listByCalendar(calendarId: CalendarId): Promise<DoorOpening[]> {
    const ids = new Set((await this.doors.listByCalendar(calendarId)).map((door) => door.id));
    return this.sorted(this.rows.filter((row) => ids.has(row.doorId)));
  }

  public create(opening: DoorOpening): Promise<void> {
    if (
      this.rows.some((row) => row.doorId === opening.doorId && row.memberId === opening.memberId)
    ) {
      return Promise.reject(
        new ConflictError(`Member ${opening.memberId} has opened door ${opening.doorId}.`),
      );
    }
    this.rows.push(structuredClone(opening));
    return Promise.resolve();
  }

  private sorted(rows: readonly DoorOpening[]): DoorOpening[] {
    return rows
      .map((row) => structuredClone(row))
      .sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  }
}
