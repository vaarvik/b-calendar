import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../src/index.js';
import type {
  CalendarWriter,
  DoorReader,
  DoorWriter,
  DraftDoorReader,
  DraftDoorWriter,
} from '../../src/index.js';
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
        hidden: true,
        opensOn: '2026-12-24',
        openTime: '17:30',
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

    it('throws ConflictError for a taken id, and lets two doors share a number', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const door = data.door(calendarId, { number: 4 });
      await fixture.current.writer.create(door);

      await expect(fixture.current.writer.create(door)).rejects.toBeInstanceOf(ConflictError);
      await expect(
        fixture.current.writer.create(data.door(calendarId, { number: 4 })),
      ).resolves.toBeUndefined();
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

export interface DraftDoorRepositoryFixture {
  readonly writer: DraftDoorWriter;
  readonly reader: DraftDoorReader;
  /** Draft doors belong to a calendar that must exist. */
  readonly calendars: CalendarWriter;
}

/** Behaviour every DraftDoorWriter and DraftDoorReader pair must have. */
export function describeDraftDoorRepositoryContract(
  name: string,
  factory: FixtureFactory<DraftDoorRepositoryFixture>,
): void {
  describe(`${name} satisfies DraftDoorReader and DraftDoorWriter`, () => {
    const fixture = new FixtureHolder(factory);

    async function calendar(data: TestData) {
      const created = data.calendar();
      await fixture.current.calendars.create(created);
      return created.id;
    }

    it('reads back a created draft door with every field', async () => {
      const data = new TestData();
      const door = data.draftDoor(await calendar(data), {
        featured: true,
        hidden: true,
        opensOn: '2026-12-24',
        openTime: '17:30',
        content: data.content({
          imageUrl: '/media/a.jpg',
          linkUrl: 'https://open.spotify.com/track/abc',
          countdown: { to: hoursAfter(T0, 1), label: 'til vi drar' },
          confetti: true,
        }),
        addedAt: hoursAfter(T0, 2),
      });

      await fixture.current.writer.create(door);

      await expect(fixture.current.reader.getById(door.id)).resolves.toEqual(door);
    });

    it('throws NotFoundError for an unknown draft door, and ConflictError for a taken id', async () => {
      const data = new TestData();
      const door = data.draftDoor(await calendar(data));
      await fixture.current.writer.create(door);

      await expect(fixture.current.reader.getById(data.doorId())).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(fixture.current.writer.create(door)).rejects.toBeInstanceOf(ConflictError);
    });

    it('lists a calendar’s draft doors by day, then by when they were added', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const later = data.draftDoor(calendarId, { opensOn: '2026-11-17' });
      const sameDaySecond = data.draftDoor(calendarId, { addedAt: hoursAfter(T0, 1) });
      const sameDayFirst = data.draftDoor(calendarId);
      await fixture.current.writer.create(later);
      await fixture.current.writer.create(sameDaySecond);
      await fixture.current.writer.create(sameDayFirst);
      await fixture.current.writer.create(data.draftDoor(await calendar(data)));

      await expect(fixture.current.reader.listByCalendar(calendarId)).resolves.toEqual([
        sameDayFirst,
        sameDaySecond,
        later,
      ]);
    });

    it('replaces a draft door, and throws NotFoundError for an unknown one', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const door = data.draftDoor(calendarId);
      await fixture.current.writer.create(door);
      const changed = { ...door, opensOn: '2026-11-16', content: data.content({ title: 'Ny' }) };

      await fixture.current.writer.save(changed);

      await expect(fixture.current.reader.getById(door.id)).resolves.toEqual(changed);
      await expect(fixture.current.writer.save(data.draftDoor(calendarId))).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('removes a draft door, and throws NotFoundError when it is already gone', async () => {
      const data = new TestData();
      const door = data.draftDoor(await calendar(data));
      await fixture.current.writer.create(door);

      await fixture.current.writer.remove(door.id);

      await expect(fixture.current.reader.getById(door.id)).rejects.toBeInstanceOf(NotFoundError);
      await expect(fixture.current.writer.remove(door.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
}
