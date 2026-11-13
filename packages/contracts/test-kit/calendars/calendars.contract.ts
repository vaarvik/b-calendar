import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../src/index.js';
import type {
  CalendarReader,
  CalendarVersionReader,
  CalendarVersionWriter,
  CalendarWriter,
} from '../../src/index.js';
import { FixtureHolder } from '../fixture.js';
import type { FixtureFactory } from '../fixture.js';
import { T0, TestData, hoursAfter } from '../test-data.js';

export interface CalendarRepositoryFixture {
  readonly writer: CalendarWriter;
  readonly reader: CalendarReader;
}

/** Behaviour every CalendarWriter and CalendarReader pair must have. */
export function describeCalendarRepositoryContract(
  name: string,
  factory: FixtureFactory<CalendarRepositoryFixture>,
): void {
  describe(`${name} satisfies CalendarReader and CalendarWriter`, () => {
    const fixture = new FixtureHolder(factory);

    it('reads back a created calendar by id and by slug', async () => {
      const calendar = new TestData().calendar();
      await fixture.current.writer.create(calendar);

      await expect(fixture.current.reader.getById(calendar.id)).resolves.toEqual(calendar);
      await expect(fixture.current.reader.findBySlug(calendar.slug)).resolves.toEqual(calendar);
    });

    it('throws NotFoundError for an unknown id and finds nothing for an unknown slug', async () => {
      const data = new TestData();

      await expect(fixture.current.reader.getById(data.calendarId())).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(fixture.current.reader.findBySlug(data.slug())).resolves.toBeNull();
    });

    it('lists calendars newest first', async () => {
      const data = new TestData();
      const older = data.calendar({ createdAt: T0 });
      const newer = data.calendar({ createdAt: hoursAfter(T0, 1) });
      await fixture.current.writer.create(older);
      await fixture.current.writer.create(newer);

      await expect(fixture.current.reader.list()).resolves.toEqual([newer, older]);
    });

    it('throws ConflictError when the slug is taken', async () => {
      const data = new TestData();
      const first = data.calendar();
      await fixture.current.writer.create(first);

      await expect(
        fixture.current.writer.create(data.calendar({ slug: first.slug })),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('replaces a calendar', async () => {
      const calendar = new TestData().calendar();
      await fixture.current.writer.create(calendar);
      const changed = { ...calendar, title: 'Jul', theme: 'christmas' as const, slug: 'jul-2026x' };

      await fixture.current.writer.save(changed);

      await expect(fixture.current.reader.getById(calendar.id)).resolves.toEqual(changed);
      await expect(fixture.current.reader.findBySlug(calendar.slug)).resolves.toBeNull();
    });

    it('throws NotFoundError when saving an unknown calendar', async () => {
      await expect(fixture.current.writer.save(new TestData().calendar())).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('throws ConflictError when saving with another calendar’s slug', async () => {
      const data = new TestData();
      const [first, second] = [data.calendar(), data.calendar()];
      await fixture.current.writer.create(first);
      await fixture.current.writer.create(second);

      await expect(
        fixture.current.writer.save({ ...second, slug: first.slug }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });
}

export interface CalendarVersionRepositoryFixture {
  readonly writer: CalendarVersionWriter;
  readonly reader: CalendarVersionReader;
  /** Versions belong to a calendar that must exist. */
  readonly calendars: CalendarWriter;
}

/** Behaviour every CalendarVersionWriter and CalendarVersionReader pair must have. */
export function describeCalendarVersionRepositoryContract(
  name: string,
  factory: FixtureFactory<CalendarVersionRepositoryFixture>,
): void {
  describe(`${name} satisfies CalendarVersionReader and CalendarVersionWriter`, () => {
    const fixture = new FixtureHolder(factory);

    async function calendar(data: TestData) {
      const created = data.calendar();
      await fixture.current.calendars.create(created);
      return created.id;
    }

    it('lists a calendar’s versions newest first, with their doors as published', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const first = data.version(calendarId);
      const second = data.version(calendarId, { version: 2, publishedAt: hoursAfter(T0, 1) });
      await fixture.current.writer.create(first);
      await fixture.current.writer.create(second);
      await fixture.current.writer.create(data.version(await calendar(data)));

      await expect(fixture.current.reader.listByCalendar(calendarId)).resolves.toEqual([
        second,
        first,
      ]);
    });

    it('keeps every door field, dates included', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const door = data.publishedDoor({
        number: 2,
        openTime: '17:30',
        featured: true,
        hidden: true,
        content: data.content({ countdown: { to: hoursAfter(T0, 5), label: 'nå' } }),
      });
      const version = data.version(calendarId, { doors: [door] });
      await fixture.current.writer.create(version);

      await expect(fixture.current.reader.listByCalendar(calendarId)).resolves.toEqual([version]);
    });

    it('lists nothing before the first publish', async () => {
      const data = new TestData();
      await expect(fixture.current.reader.listByCalendar(await calendar(data))).resolves.toEqual(
        [],
      );
    });

    it('throws ConflictError when the version number is taken', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      await fixture.current.writer.create(data.version(calendarId));

      await expect(
        fixture.current.writer.create(data.version(calendarId, { doors: [] })),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });
}
