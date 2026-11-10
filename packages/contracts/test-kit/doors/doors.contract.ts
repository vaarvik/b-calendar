import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../src/index.js';
import type { CalendarWriter, DoorReader, DoorWriter } from '../../src/index.js';
import { FixtureHolder } from '../fixture.js';
import type { FixtureFactory } from '../fixture.js';
import { T0, TestData, hoursAfter } from '../test-data.js';

export interface DoorRepositoryFixture {
  readonly writer: DoorWriter;
  readonly reader: DoorReader;
  /** Doors belong to a calendar that must exist. */
  readonly calendars: CalendarWriter;
}

/** Behaviour every DoorWriter and DoorReader pair must have. */
export function describeDoorRepositoryContract(
  name: string,
  factory: FixtureFactory<DoorRepositoryFixture>,
): void {
  describe(`${name} satisfies DoorReader and DoorWriter`, () => {
    const fixture = new FixtureHolder(factory);

    async function calendar(data: TestData) {
      const created = data.calendar();
      await fixture.current.calendars.create(created);
      return created.id;
    }

    it('reads back a created door with every field', async () => {
      const data = new TestData();
      const door = data.door(await calendar(data), {
        featured: true,
        content: data.content({
          imageUrl: '/media/a.jpg',
          linkUrl: 'https://open.spotify.com/track/abc',
          countdown: { to: hoursAfter(T0, 1), label: 'til vi drar' },
          confetti: true,
        }),
        notifiedAt: hoursAfter(T0, 2),
        firstOpenedAt: hoursAfter(T0, 3),
      });

      await fixture.current.writer.create(door);

      await expect(fixture.current.reader.getById(door.id)).resolves.toEqual(door);
    });

    it('throws NotFoundError for an unknown door', async () => {
      await expect(fixture.current.reader.getById(new TestData().doorId())).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('lists a calendar’s doors by number', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const other = await calendar(data);
      const third = data.door(calendarId, { number: 3 });
      const first = data.door(calendarId, { number: 1 });
      await fixture.current.writer.create(third);
      await fixture.current.writer.create(first);
      await fixture.current.writer.create(data.door(other, { number: 2 }));

      await expect(fixture.current.reader.listByCalendar(calendarId)).resolves.toEqual([
        first,
        third,
      ]);
    });

    it('throws ConflictError when the number is taken in the calendar', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      await fixture.current.writer.create(data.door(calendarId, { number: 4 }));

      await expect(
        fixture.current.writer.create(data.door(calendarId, { number: 4 })),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('lists opened, unnotified doors of every calendar, oldest first', async () => {
      const data = new TestData();
      const [a, b] = [await calendar(data), await calendar(data)];
      const later = data.door(a, { number: 1, opensAt: hoursAfter(T0, -1) });
      const earlier = data.door(b, { number: 1, opensAt: hoursAfter(T0, -2) });
      const exactlyNow = data.door(a, { number: 2, opensAt: T0 });
      await fixture.current.writer.create(later);
      await fixture.current.writer.create(earlier);
      await fixture.current.writer.create(exactlyNow);
      await fixture.current.writer.create(data.door(a, { number: 3, opensAt: hoursAfter(T0, 1) }));
      await fixture.current.writer.create(
        data.door(b, { number: 2, opensAt: hoursAfter(T0, -3), notifiedAt: T0 }),
      );

      await expect(fixture.current.reader.listUnnotified(T0)).resolves.toEqual([
        earlier,
        later,
        exactlyNow,
      ]);
    });

    it('replaces a door', async () => {
      const data = new TestData();
      const door = data.door(await calendar(data));
      await fixture.current.writer.create(door);
      const changed = {
        ...door,
        number: 9,
        content: data.content({ title: 'Ny', message: 'Linje 1\nLinje 2' }),
        notifiedAt: T0,
      };

      await fixture.current.writer.save(changed);

      await expect(fixture.current.reader.getById(door.id)).resolves.toEqual(changed);
    });

    it('throws NotFoundError when saving an unknown door', async () => {
      const data = new TestData();
      await expect(
        fixture.current.writer.save(data.door(await calendar(data))),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws ConflictError when saving with another door’s number', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const one = data.door(calendarId, { number: 1 });
      const two = data.door(calendarId, { number: 2 });
      await fixture.current.writer.create(one);
      await fixture.current.writer.create(two);

      await expect(fixture.current.writer.save({ ...two, number: 1 })).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it('removes a door, and throws NotFoundError when it is already gone', async () => {
      const data = new TestData();
      const door = data.door(await calendar(data));
      await fixture.current.writer.create(door);

      await fixture.current.writer.remove(door.id);

      await expect(fixture.current.reader.getById(door.id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(fixture.current.writer.remove(door.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
}
