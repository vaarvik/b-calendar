import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../src/index.js';
import type { CalendarWriter, MemberReader, MemberWriter } from '../../src/index.js';
import { FixtureHolder } from '../fixture.js';
import type { FixtureFactory } from '../fixture.js';
import { T0, TestData, hoursAfter } from '../test-data.js';

export interface MemberRepositoryFixture {
  readonly writer: MemberWriter;
  readonly reader: MemberReader;
  /** Members belong to a calendar that must exist. */
  readonly calendars: CalendarWriter;
}

/** Behaviour every MemberWriter and MemberReader pair must have. */
export function describeMemberRepositoryContract(
  name: string,
  factory: FixtureFactory<MemberRepositoryFixture>,
): void {
  describe(`${name} satisfies MemberReader and MemberWriter`, () => {
    const fixture = new FixtureHolder(factory);

    async function calendar(data: TestData) {
      const created = data.calendar();
      await fixture.current.calendars.create(created);
      return created.id;
    }

    it('reads back a created member, and lists a calendar’s members by when they were added', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const later = data.member(calendarId, { name: 'Johann', addedAt: hoursAfter(T0, 1) });
      const first = data.member(calendarId, { name: 'Karoline 🎂' });
      await fixture.current.writer.create(later);
      await fixture.current.writer.create(first);
      await fixture.current.writer.create(data.member(await calendar(data)));

      await expect(fixture.current.reader.getById(first.id)).resolves.toEqual(first);
      await expect(fixture.current.reader.listByCalendar(calendarId)).resolves.toEqual([
        first,
        later,
      ]);
    });

    it('lists nothing for a calendar without members, and refuses a taken id', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const member = data.member(calendarId);

      await expect(fixture.current.reader.listByCalendar(calendarId)).resolves.toEqual([]);
      await fixture.current.writer.create(member);
      await expect(fixture.current.writer.create(member)).rejects.toBeInstanceOf(ConflictError);
    });

    it('replaces a member, and throws NotFoundError for an unknown one', async () => {
      const data = new TestData();
      const calendarId = await calendar(data);
      const member = data.member(calendarId);
      await fixture.current.writer.create(member);
      const changed = { ...member, name: 'Ida K', key: 'new-key' };

      await fixture.current.writer.save(changed);

      await expect(fixture.current.reader.getById(member.id)).resolves.toEqual(changed);
      await expect(fixture.current.reader.getById(data.memberId())).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(fixture.current.writer.save(data.member(calendarId))).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('removes a member, and throws NotFoundError when it is already gone', async () => {
      const data = new TestData();
      const member = data.member(await calendar(data));
      await fixture.current.writer.create(member);

      await fixture.current.writer.remove(member.id);

      await expect(fixture.current.reader.listByCalendar(member.calendarId)).resolves.toEqual([]);
      await expect(fixture.current.writer.remove(member.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
}
