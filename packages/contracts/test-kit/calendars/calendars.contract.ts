import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../src/index.js';
import type { CalendarReader, CalendarWriter } from '../../src/index.js';
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
