import {
  AddDoorUseCase,
  EditDoorUseCase,
  KeyCalendarAccessAuthenticator,
  OpenDoorUseCase,
  RemoveDoorUseCase,
  ZodInputValidator,
} from '@b-calendar/application';
import {
  ConflictError,
  DoorLockedError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from '@b-calendar/contracts';
import type { DoorDraft } from '@b-calendar/contracts';
import { T0, TestData, hoursAfter } from '@b-calendar/contracts/test-kit';
import {
  ConstantTimeSecretMatcher,
  LinkDoorPreviewPresenter,
  OpensAtRecipientDoorPresenter,
  UrlDoorLinkClassifier,
} from '@b-calendar/domain';
import { InMemoryCalendarRepository, InMemoryDoorRepository } from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { ManualClock, RandomIds } from '../shared/fakes.js';

async function setup() {
  const data = new TestData();
  const calendars = new InMemoryCalendarRepository();
  const doors = new InMemoryDoorRepository();
  const clock = new ManualClock();
  const validator = new ZodInputValidator();
  const links = new UrlDoorLinkClassifier();
  const previews = new LinkDoorPreviewPresenter(links);
  const calendar = data.calendar();
  await calendars.create(calendar);
  return {
    data,
    calendar,
    doors,
    clock,
    add: new AddDoorUseCase(calendars, doors, previews, new RandomIds(), validator),
    edit: new EditDoorUseCase(doors, doors, previews, clock, validator),
    remove: new RemoveDoorUseCase(doors),
    open: new OpenDoorUseCase(
      new KeyCalendarAccessAuthenticator(calendars, new ConstantTimeSecretMatcher()),
      doors,
      doors,
      new OpensAtRecipientDoorPresenter(links),
      clock,
    ),
  };
}

function draft(overrides: Partial<DoorDraft> = {}): DoorDraft {
  return {
    number: 1,
    opensAt: T0,
    content: new TestData().content(),
    notification: { title: 'Luke 1', body: 'Åpne meg' },
    ...overrides,
  };
}

describe('AddDoor', () => {
  it('adds a door that has not been notified or opened', async () => {
    const { add, calendar, doors } = await setup();

    const door = await add.execute({ calendarId: calendar.id, draft: draft() });

    expect(door).toMatchObject({
      ...draft(),
      calendarId: calendar.id,
      notifiedAt: null,
      firstOpenedAt: null,
      link: null,
    });
    await expect(doors.getById(door.id)).resolves.toMatchObject({ number: 1 });
  });

  it('accepts times as ISO strings, as they come over HTTP', async () => {
    const { add, calendar } = await setup();
    const fromWire = { ...draft(), opensAt: '2026-11-15T08:00:00+01:00' } as unknown as DoorDraft;

    const door = await add.execute({ calendarId: calendar.id, draft: fromWire });

    expect(door.opensAt).toEqual(new Date('2026-11-15T07:00:00.000Z'));
  });

  it('refuses an invalid draft, an unknown calendar and a taken number', async () => {
    const { add, calendar, data } = await setup();
    await add.execute({ calendarId: calendar.id, draft: draft() });

    await expect(
      add.execute({ calendarId: calendar.id, draft: draft({ number: 0 }) }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      add.execute({ calendarId: data.calendarId(), draft: draft() }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(add.execute({ calendarId: calendar.id, draft: draft() })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe('EditDoor', () => {
  it('changes the door and keeps when it was notified and first opened', async () => {
    const { edit, doors, data, calendar } = await setup();
    const door = data.door(calendar.id, {
      opensAt: hoursAfter(T0, -1),
      notifiedAt: T0,
      firstOpenedAt: T0,
    });
    await doors.create(door);

    const edited = await edit.execute({
      doorId: door.id,
      draft: draft({ opensAt: hoursAfter(T0, -1), content: data.content({ title: 'Ny tittel' }) }),
    });

    expect(edited).toMatchObject({
      notifiedAt: T0,
      firstOpenedAt: T0,
      content: { title: 'Ny tittel' },
    });
  });

  it('notifies again when the door is moved into the future', async () => {
    const { edit, doors, data, calendar } = await setup();
    const door = data.door(calendar.id, { notifiedAt: T0 });
    await doors.create(door);

    const edited = await edit.execute({
      doorId: door.id,
      draft: draft({ opensAt: hoursAfter(T0, 5) }),
    });

    expect(edited.notifiedAt).toBeNull();
  });

  it('refuses an invalid draft and an unknown door', async () => {
    const { edit, doors, data, calendar } = await setup();
    const door = data.door(calendar.id);
    await doors.create(door);

    await expect(
      edit.execute({ doorId: door.id, draft: draft({ notification: { title: '', body: '' } }) }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(edit.execute({ doorId: data.doorId(), draft: draft() })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('RemoveDoor', () => {
  it('removes a door', async () => {
    const { remove, doors, data, calendar } = await setup();
    const door = data.door(calendar.id);
    await doors.create(door);

    await remove.execute({ doorId: door.id });

    await expect(doors.listByCalendar(calendar.id)).resolves.toEqual([]);
  });
});

describe('OpenDoor', () => {
  it('opens a ready door, records the first look, and keeps it on later looks', async () => {
    const { open, doors, data, calendar, clock } = await setup();
    const door = data.door(calendar.id, { number: 2, opensAt: hoursAfter(T0, -1) });
    await doors.create(door);
    const access = { slug: calendar.slug, accessKey: calendar.accessKey, number: 2 };

    const first = await open.execute(access);
    clock.set(hoursAfter(T0, 3));
    const again = await open.execute(access);

    expect(first).toMatchObject({
      number: 2,
      opensAt: door.opensAt,
      content: { title: door.content.title, link: null },
    });
    expect(again).toEqual(first);
    await expect(doors.getById(door.id)).resolves.toMatchObject({ firstOpenedAt: T0 });
  });

  it('refuses a locked door and does not record anything', async () => {
    const { open, doors, data, calendar } = await setup();
    const door = data.door(calendar.id, { opensAt: hoursAfter(T0, 1) });
    await doors.create(door);

    await expect(
      open.execute({ slug: calendar.slug, accessKey: calendar.accessKey, number: 1 }),
    ).rejects.toBeInstanceOf(DoorLockedError);
    await expect(doors.getById(door.id)).resolves.toMatchObject({ firstOpenedAt: null });
  });

  it('refuses a wrong key and a door number the calendar does not have', async () => {
    const { open, calendar } = await setup();

    await expect(
      open.execute({ slug: calendar.slug, accessKey: 'wrong', number: 1 }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      open.execute({ slug: calendar.slug, accessKey: calendar.accessKey, number: 7 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
