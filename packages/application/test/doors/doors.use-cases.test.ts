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
  ZonedDoorScheduleCalculator,
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
  const schedule = new ZonedDoorScheduleCalculator();
  const calendar = data.calendar();
  await calendars.create(calendar);
  return {
    data,
    calendar,
    doors,
    clock,
    add: new AddDoorUseCase(calendars, doors, previews, schedule, new RandomIds(), validator),
    edit: new EditDoorUseCase(calendars, doors, doors, previews, schedule, clock, validator),
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
    opensOn: '2026-11-15',
    openTime: null,
    featured: false,
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
      opensAt: T0,
      calendarId: calendar.id,
      notifiedAt: null,
      firstOpenedAt: null,
      link: null,
    });
    await expect(doors.getById(door.id)).resolves.toMatchObject({ number: 1 });
  });

  it('opens at the calendar’s default time unless the door has its own', async () => {
    const { add, calendar } = await setup();

    const byDefault = await add.execute({ calendarId: calendar.id, draft: draft() });
    const ownTime = await add.execute({
      calendarId: calendar.id,
      draft: draft({ number: 2, opensOn: '2026-11-16', openTime: '18:30' }),
    });

    expect(byDefault.opensAt).toEqual(new Date('2026-11-15T07:00:00.000Z'));
    expect(ownTime.opensAt).toEqual(new Date('2026-11-16T17:30:00.000Z'));
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
      draft: draft({ openTime: '07:00', content: data.content({ title: 'Ny tittel' }) }),
    });

    expect(edited).toMatchObject({
      opensAt: hoursAfter(T0, -1),
      openTime: '07:00',
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
      draft: draft({ openTime: '13:00' }),
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
