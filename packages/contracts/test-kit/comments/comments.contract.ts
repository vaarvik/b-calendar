import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../src/index.js';
import type {
  CalendarWriter,
  DoorCommentReader,
  DoorCommentWriter,
  DoorWriter,
} from '../../src/index.js';
import { FixtureHolder } from '../fixture.js';
import type { FixtureFactory } from '../fixture.js';
import { T0, TestData, hoursAfter } from '../test-data.js';

export interface DoorCommentRepositoryFixture {
  readonly writer: DoorCommentWriter;
  readonly reader: DoorCommentReader;
  /** Comments belong to a published door of a calendar; both must exist. */
  readonly calendars: CalendarWriter;
  readonly doors: DoorWriter;
}

/** Behaviour every DoorCommentWriter and DoorCommentReader pair must have. */
export function describeDoorCommentRepositoryContract(
  name: string,
  factory: FixtureFactory<DoorCommentRepositoryFixture>,
): void {
  describe(`${name} satisfies DoorCommentReader and DoorCommentWriter`, () => {
    const fixture = new FixtureHolder(factory);

    async function door(data: TestData) {
      const calendar = data.calendar();
      await fixture.current.calendars.create(calendar);
      const created = data.door(calendar.id);
      await fixture.current.doors.create(created);
      return created.id;
    }

    it('lists a door’s comments oldest first, with every field', async () => {
      const data = new TestData();
      const doorId = await door(data);
      const later = data.comment(doorId, { createdAt: hoursAfter(T0, 1), role: 'follower' });
      const first = data.comment(doorId, { text: 'Linje 1\nLinje 2 🎉' });
      await fixture.current.writer.create(later);
      await fixture.current.writer.create(first);
      await fixture.current.writer.create(data.comment(await door(data)));

      await expect(fixture.current.reader.listByDoor(doorId)).resolves.toEqual([first, later]);
    });

    it('lists nothing for a door without comments, and refuses a taken id', async () => {
      const data = new TestData();
      const doorId = await door(data);
      const comment = data.comment(doorId);

      await expect(fixture.current.reader.listByDoor(doorId)).resolves.toEqual([]);
      await fixture.current.writer.create(comment);
      await expect(fixture.current.writer.create(comment)).rejects.toBeInstanceOf(ConflictError);
    });

    it('removes a comment, and throws NotFoundError when it is already gone', async () => {
      const data = new TestData();
      const comment = data.comment(await door(data));
      await fixture.current.writer.create(comment);

      await fixture.current.writer.remove(comment.id);

      await expect(fixture.current.reader.listByDoor(comment.doorId)).resolves.toEqual([]);
      await expect(fixture.current.writer.remove(comment.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
}
