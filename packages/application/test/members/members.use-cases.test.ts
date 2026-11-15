import {
  AddMemberUseCase,
  RemoveMemberUseCase,
  RenameMemberUseCase,
  RotateMemberKeyUseCase,
  ZodInputValidator,
} from '@b-calendar/application';
import { NotFoundError, ValidationError } from '@b-calendar/contracts';
import { T0, TestData } from '@b-calendar/contracts/test-kit';
import { InMemoryCalendarRepository, InMemoryMemberRepository } from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { CountingSecrets, ManualClock, RandomIds } from '../shared/fakes.js';

async function setup() {
  const data = new TestData();
  const calendars = new InMemoryCalendarRepository();
  const members = new InMemoryMemberRepository();
  const secrets = new CountingSecrets();
  const validator = new ZodInputValidator();
  const calendar = data.calendar();
  await calendars.create(calendar);
  return {
    data,
    calendar,
    members,
    add: new AddMemberUseCase(
      calendars,
      members,
      new RandomIds(),
      secrets,
      new ManualClock(),
      validator,
    ),
    rename: new RenameMemberUseCase(members, members, validator),
    rotate: new RotateMemberKeyUseCase(members, members, secrets),
    remove: new RemoveMemberUseCase(members),
  };
}

describe('AddMember', () => {
  it('adds a person with their own fresh key', async () => {
    const { add, calendar, members } = await setup();

    const ida = await add.execute({ calendarId: calendar.id, name: ' Ida ' });
    const johann = await add.execute({ calendarId: calendar.id, name: 'Johann' });

    expect(ida).toMatchObject({
      calendarId: calendar.id,
      name: 'Ida',
      key: 'secret-1',
      addedAt: T0,
    });
    expect(johann.key).toBe('secret-2');
    await expect(members.listByCalendar(calendar.id)).resolves.toEqual([ida, johann]);
  });

  it('refuses an empty name and an unknown calendar', async () => {
    const { add, calendar, data } = await setup();

    await expect(add.execute({ calendarId: calendar.id, name: '  ' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      add.execute({ calendarId: data.calendarId(), name: 'Ida' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('RenameMember, RotateMemberKey and RemoveMember', () => {
  it('renames a member and keeps their key', async () => {
    const { add, rename, calendar } = await setup();
    const ida = await add.execute({ calendarId: calendar.id, name: 'Ida' });

    await expect(rename.execute({ memberId: ida.id, name: 'Ida K' })).resolves.toEqual({
      ...ida,
      name: 'Ida K',
    });
    await expect(rename.execute({ memberId: ida.id, name: '' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('gives a member a new key, and leaves the others alone', async () => {
    const { add, rotate, members, calendar } = await setup();
    const ida = await add.execute({ calendarId: calendar.id, name: 'Ida' });
    const johann = await add.execute({ calendarId: calendar.id, name: 'Johann' });

    await expect(rotate.execute({ memberId: ida.id })).resolves.toEqual({
      ...ida,
      key: 'secret-3',
    });
    await expect(members.getById(johann.id)).resolves.toEqual(johann);
  });

  it('removes a member, and refuses one that does not exist', async () => {
    const { add, remove, members, calendar, data } = await setup();
    const ida = await add.execute({ calendarId: calendar.id, name: 'Ida' });

    await remove.execute({ memberId: ida.id });

    await expect(members.listByCalendar(calendar.id)).resolves.toEqual([]);
    await expect(remove.execute({ memberId: data.memberId() })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
