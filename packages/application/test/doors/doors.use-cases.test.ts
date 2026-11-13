import {
  AddDoorUseCase,
  EditDoorUseCase,
  KeyCalendarAccessAuthenticator,
  OpenDoorUseCase,
  RemoveDoorUseCase,
  ZodInputValidator,
} from '@b-calendar/application';
import {
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
  NumberedDraftDoorPresenter,
  OpensAtDoorNumberCalculator,
  OpensAtRecipientDoorPresenter,
  UrlDoorLinkClassifier,
  ZonedDoorScheduleCalculator,
} from '@b-calendar/domain';
import {
  InMemoryCalendarRepository,
  InMemoryDoorRepository,
  InMemoryDraftDoorRepository,
} from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { ManualClock, RandomIds } from '../shared/fakes.js';

async function setup() {
  const data = new TestData();
  const calendars = new InMemoryCalendarRepository();
  const doors = new InMemoryDoorRepository();
  const drafts = new InMemoryDraftDoorRepository();
  const clock = new ManualClock();
  const validator = new ZodInputValidator();
  const links = new UrlDoorLinkClassifier();
  const presenter = new NumberedDraftDoorPresenter(
    new ZonedDoorScheduleCalculator(),
    new OpensAtDoorNumberCalculator(),
    new LinkDoorPreviewPresenter(links),
  );
  const calendar = data.calendar();
  await calendars.create(calendar);
  return {
    data,
    calendar,
    doors,
    drafts,
    clock,
    add: new AddDoorUseCase(
      calendars,
      drafts,
      drafts,
      doors,
      presenter,
      new RandomIds(),
      clock,
      validator,
    ),
    edit: new EditDoorUseCase(calendars, drafts, drafts, doors, presenter, validator),
    remove: new RemoveDoorUseCase(drafts),
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
    opensOn: '2026-11-15',
    openTime: null,
    featured: false,
    hidden: false,
    content: new TestData().content(),
    notification: { title: 'Luke 1', body: 'Åpne meg' },
    ...overrides,
  };
}

describe('AddDoor', () => {
  it('adds a door to the draft only: the recipient does not get it yet', async () => {
    const { add, calendar, drafts, doors } = await setup();

    const door = await add.execute({ calendarId: calendar.id, draft: draft() });

    expect(door).toMatchObject({
      ...draft(),
      number: 1,
      opensAt: T0,
      calendarId: calendar.id,
      notifiedAt: null,
      firstOpenedAt: null,
      link: null,
    });
    await expect(drafts.getById(door.id)).resolves.toMatchObject({ ...draft(), addedAt: T0 });
    await expect(doors.listByCalendar(calendar.id)).resolves.toEqual([]);
  });

  it('numbers the door by date among the draft’s doors', async () => {
    const { add, calendar } = await setup();

    await add.execute({ calendarId: calendar.id, draft: draft({ opensOn: '2026-11-17' }) });
    const earlier = await add.execute({
      calendarId: calendar.id,
      draft: draft({ opensOn: '2026-11-16', openTime: '18:30' }),
    });

    expect(earlier).toMatchObject({
      number: 1,
      opensAt: new Date('2026-11-16T17:30:00.000Z'),
    });
  });

  it('takes images on this site or over http(s), and refuses other addresses', async () => {
    const { add, data, calendar } = await setup();
    const withImage = (imageUrl: string) =>
      add.execute({
        calendarId: calendar.id,
        draft: draft({ content: data.content({ imageUrl }) }),
      });

    await expect(withImage('/media/a1.jpg')).resolves.toMatchObject({
      content: { imageUrl: '/media/a1.jpg' },
    });
    await expect(withImage('/icon-512.png')).resolves.toMatchObject({
      content: { imageUrl: '/icon-512.png' },
    });
    await expect(withImage('https://example.com/a.png')).resolves.toMatchObject({
      content: { imageUrl: 'https://example.com/a.png' },
    });
    for (const refused of ['//evil.example/a.png', 'javascript:alert(1)', 'media/a.jpg']) {
      await expect(withImage(refused)).rejects.toBeInstanceOf(ValidationError);
    }
  });

  it('refuses an invalid draft and an unknown calendar', async () => {
    const { add, data, calendar } = await setup();

    await expect(
      add.execute({ calendarId: calendar.id, draft: draft({ opensOn: '15.11' }) }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      add.execute({ calendarId: data.calendarId(), draft: draft() }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('EditDoor', () => {
  it('changes the draft door, keeps when it was added, and leaves the published door alone', async () => {
    const { edit, drafts, doors, data, calendar } = await setup();
    const saved = data.draftDoor(calendar.id);
    const published = data.door(calendar.id, { id: saved.id, firstOpenedAt: T0, notifiedAt: T0 });
    await drafts.create(saved);
    await doors.create(published);

    const edited = await edit.execute({
      doorId: saved.id,
      draft: draft({ openTime: '07:00', content: data.content({ title: 'Ny tittel' }) }),
    });

    expect(edited).toMatchObject({
      opensAt: hoursAfter(T0, -1),
      openTime: '07:00',
      notifiedAt: T0,
      firstOpenedAt: T0,
      content: { title: 'Ny tittel' },
    });
    await expect(drafts.getById(saved.id)).resolves.toMatchObject({ addedAt: saved.addedAt });
    await expect(doors.getById(saved.id)).resolves.toEqual(published);
  });

  it('refuses an invalid draft and an unknown door', async () => {
    const { edit, drafts, data, calendar } = await setup();
    const saved = data.draftDoor(calendar.id);
    await drafts.create(saved);

    await expect(
      edit.execute({ doorId: saved.id, draft: draft({ notification: { title: '', body: '' } }) }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(edit.execute({ doorId: data.doorId(), draft: draft() })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('RemoveDoor', () => {
  it('removes the door from the draft', async () => {
    const { remove, drafts, data, calendar } = await setup();
    const saved = data.draftDoor(calendar.id);
    await drafts.create(saved);

    await remove.execute({ doorId: saved.id });

    await expect(drafts.listByCalendar(calendar.id)).resolves.toEqual([]);
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

  it('answers a secret door that has not opened as if it did not exist', async () => {
    const { open, doors, data, calendar } = await setup();
    await doors.create(data.door(calendar.id, { opensAt: hoursAfter(T0, 1), hidden: true }));

    await expect(
      open.execute({ slug: calendar.slug, accessKey: calendar.accessKey, number: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
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
