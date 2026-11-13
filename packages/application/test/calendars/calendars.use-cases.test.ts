import {
  CreateCalendarUseCase,
  GetCalendarDetailsUseCase,
  KeyCalendarAccessAuthenticator,
  ListCalendarsUseCase,
  PublishCalendarUseCase,
  RotateCalendarKeyUseCase,
  UpdateCalendarUseCase,
  ViewCalendarUseCase,
  ZodInputValidator,
} from '@b-calendar/application';
import {
  ConflictError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from '@b-calendar/contracts';
import type { CalendarSettings } from '@b-calendar/contracts';
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
  InMemoryCalendarVersionRepository,
  InMemoryDoorRepository,
  InMemoryDraftDoorRepository,
  InMemorySubscriptionRepository,
} from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { CountingSecrets, ManualClock, RandomIds } from '../shared/fakes.js';

const SETTINGS: CalendarSettings = {
  slug: 'ida-30',
  title: 'Bursdagsuka',
  recipientName: 'Ida',
  theme: 'birthday',
  locale: 'nb',
  timeZone: 'Europe/Oslo',
  defaultOpenTime: '08:00',
};

function setup() {
  const calendars = new InMemoryCalendarRepository();
  const doors = new InMemoryDoorRepository();
  const drafts = new InMemoryDraftDoorRepository();
  const versions = new InMemoryCalendarVersionRepository();
  const subscriptions = new InMemorySubscriptionRepository();
  const clock = new ManualClock();
  const validator = new ZodInputValidator();
  const secrets = new CountingSecrets();
  const links = new UrlDoorLinkClassifier();
  const access = new KeyCalendarAccessAuthenticator(calendars, new ConstantTimeSecretMatcher());
  const presenter = new NumberedDraftDoorPresenter(
    new ZonedDoorScheduleCalculator(),
    new OpensAtDoorNumberCalculator(),
    new LinkDoorPreviewPresenter(links),
  );
  return {
    calendars,
    doors,
    drafts,
    versions,
    subscriptions,
    clock,
    create: new CreateCalendarUseCase(calendars, new RandomIds(), secrets, clock, validator),
    update: new UpdateCalendarUseCase(calendars, calendars, validator),
    rotate: new RotateCalendarKeyUseCase(calendars, calendars, secrets),
    list: new ListCalendarsUseCase(calendars),
    details: new GetCalendarDetailsUseCase(
      calendars,
      drafts,
      doors,
      versions,
      subscriptions,
      presenter,
    ),
    publish: new PublishCalendarUseCase(
      calendars,
      drafts,
      doors,
      doors,
      versions,
      versions,
      presenter,
      clock,
    ),
    view: new ViewCalendarUseCase(access, doors, new OpensAtRecipientDoorPresenter(links), clock),
  };
}

describe('CreateCalendar', () => {
  it('creates a calendar with fresh keys for her link and the followers’ link', async () => {
    const { create, calendars } = setup();

    const calendar = await create.execute(SETTINGS);

    expect(calendar).toMatchObject({
      ...SETTINGS,
      accessKey: 'secret-1',
      followerKey: 'secret-2',
      createdAt: T0,
    });
    await expect(calendars.getById(calendar.id)).resolves.toEqual(calendar);
  });

  it('refuses invalid settings', async () => {
    await expect(
      setup().create.execute({ ...SETTINGS, slug: 'Not A Slug' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('refuses a taken slug', async () => {
    const { create } = setup();
    await create.execute(SETTINGS);

    await expect(create.execute(SETTINGS)).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('UpdateCalendar and RotateCalendarKey', () => {
  it('changes the settings and keeps the key', async () => {
    const { create, update } = setup();
    const calendar = await create.execute(SETTINGS);

    const updated = await update.execute({
      calendarId: calendar.id,
      settings: { ...SETTINGS, title: 'Jul', theme: 'christmas' },
    });

    expect(updated).toEqual({ ...calendar, title: 'Jul', theme: 'christmas' });
  });

  it('refuses invalid settings', async () => {
    const { create, update } = setup();
    const calendar = await create.execute(SETTINGS);

    await expect(
      update.execute({ calendarId: calendar.id, settings: { ...SETTINGS, title: '' } }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('gives one link a new key and leaves the other working', async () => {
    const { create, rotate } = setup();
    const calendar = await create.execute(SETTINGS);

    await expect(rotate.execute({ calendarId: calendar.id, role: 'recipient' })).resolves.toEqual({
      ...calendar,
      accessKey: 'secret-3',
    });
    await expect(rotate.execute({ calendarId: calendar.id, role: 'follower' })).resolves.toEqual({
      ...calendar,
      accessKey: 'secret-3',
      followerKey: 'secret-4',
    });
  });
});

describe('ListCalendars and GetCalendarDetails', () => {
  it('lists calendars and shows one with its draft in full, its versions and subscribers', async () => {
    const { create, list, details, drafts, publish, clock, subscriptions } = setup();
    const calendar = await create.execute(SETTINGS);
    const data = new TestData();
    const door = data.draftDoor(calendar.id, {
      opensOn: '2026-11-16',
      content: data.content({ linkUrl: 'https://youtu.be/dQw4w9WgXcQ' }),
    });
    await drafts.create(door);
    await subscriptions.upsert(data.subscription(calendar.id));
    clock.set(hoursAfter(T0, 1));
    await publish.execute({ calendarId: calendar.id });

    await expect(list.execute()).resolves.toEqual([calendar]);
    const shown = await details.execute({ calendarId: calendar.id });
    expect(shown).toMatchObject({
      calendar,
      subscriberCount: 1,
      unpublishedChanges: false,
      versions: [{ version: 1, publishedAt: hoursAfter(T0, 1), doorCount: 1 }],
    });
    expect(shown.doors).toEqual([
      expect.objectContaining({
        id: door.id,
        number: 1,
        opensAt: new Date('2026-11-16T07:00:00.000Z'),
        link: expect.objectContaining({ kind: 'youtube' }) as unknown,
      }),
    ]);
  });

  it('tells when the draft differs from what the recipient has', async () => {
    const { create, details, drafts, publish } = setup();
    const calendar = await create.execute(SETTINGS);
    const data = new TestData();
    const changed = async () =>
      (await details.execute({ calendarId: calendar.id })).unpublishedChanges;

    await expect(changed()).resolves.toBe(false);
    const door = data.draftDoor(calendar.id);
    await drafts.create(door);
    await expect(changed()).resolves.toBe(true);
    await publish.execute({ calendarId: calendar.id });
    await expect(changed()).resolves.toBe(false);
    await drafts.save({ ...door, content: data.content({ title: 'Endret' }) });
    await expect(changed()).resolves.toBe(true);
  });
});

describe('PublishCalendar', () => {
  it('gives the recipient the draft’s doors, numbered by date, as version 1', async () => {
    const { create, publish, drafts, doors, versions } = setup();
    const calendar = await create.execute(SETTINGS);
    const data = new TestData();
    const later = data.draftDoor(calendar.id, { opensOn: '2026-11-17' });
    const first = data.draftDoor(calendar.id, {
      opensOn: '2026-11-15',
      featured: true,
      hidden: true,
    });
    await drafts.create(later);
    await drafts.create(first);

    await expect(publish.execute({ calendarId: calendar.id })).resolves.toEqual({
      version: 1,
      publishedAt: T0,
      doorCount: 2,
    });

    await expect(doors.listByCalendar(calendar.id)).resolves.toEqual([
      expect.objectContaining({
        id: first.id,
        number: 1,
        opensAt: T0,
        featured: true,
        hidden: true,
      }),
      expect.objectContaining({
        id: later.id,
        number: 2,
        opensAt: new Date('2026-11-17T07:00:00.000Z'),
        notifiedAt: null,
        firstOpenedAt: null,
      }),
    ]);
    const [version] = await versions.listByCalendar(calendar.id);
    expect(version?.doors.map((door) => [door.id, door.number])).toEqual([
      [first.id, 1],
      [later.id, 2],
    ]);
  });

  it('keeps her progress, renumbers, notifies a door moved into the future again, and removes dropped doors', async () => {
    const { create, publish, drafts, doors, clock } = setup();
    const calendar = await create.execute(SETTINGS);
    const data = new TestData();
    const opened = data.draftDoor(calendar.id, { opensOn: '2026-11-15' });
    const moved = data.draftDoor(calendar.id, { opensOn: '2026-11-14' });
    const dropped = data.draftDoor(calendar.id, { opensOn: '2026-11-13' });
    for (const door of [opened, moved, dropped]) {
      await drafts.create(door);
    }
    await publish.execute({ calendarId: calendar.id });
    const before = await doors.getById(opened.id);
    await doors.save({ ...before, notifiedAt: T0, firstOpenedAt: T0 });
    await doors.save({ ...(await doors.getById(moved.id)), notifiedAt: T0 });

    await drafts.save({ ...moved, opensOn: '2026-11-18' });
    await drafts.remove(dropped.id);
    clock.set(hoursAfter(T0, 1));
    const summary = await publish.execute({ calendarId: calendar.id });

    expect(summary).toEqual({ version: 2, publishedAt: hoursAfter(T0, 1), doorCount: 2 });
    await expect(doors.listByCalendar(calendar.id)).resolves.toEqual([
      expect.objectContaining({ id: opened.id, number: 1, notifiedAt: T0, firstOpenedAt: T0 }),
      expect.objectContaining({ id: moved.id, number: 2, notifiedAt: null }),
    ]);
  });

  it('moves doors without their own time when the default time changed since the last publish', async () => {
    const { create, update, publish, drafts, doors } = setup();
    const calendar = await create.execute(SETTINGS);
    const data = new TestData();
    const byDefault = data.draftDoor(calendar.id, { opensOn: '2026-11-16' });
    const ownTime = data.draftDoor(calendar.id, { opensOn: '2026-11-17', openTime: '18:30' });
    await drafts.create(byDefault);
    await drafts.create(ownTime);
    await publish.execute({ calendarId: calendar.id });

    await update.execute({
      calendarId: calendar.id,
      settings: { ...SETTINGS, defaultOpenTime: '10:15' },
    });
    await expect(doors.getById(byDefault.id)).resolves.toMatchObject({
      opensAt: new Date('2026-11-16T07:00:00.000Z'),
    });
    await publish.execute({ calendarId: calendar.id });

    await expect(doors.getById(byDefault.id)).resolves.toMatchObject({
      opensAt: new Date('2026-11-16T09:15:00.000Z'),
    });
    await expect(doors.getById(ownTime.id)).resolves.toMatchObject({
      opensAt: new Date('2026-11-17T17:30:00.000Z'),
    });
  });

  it('keeps a door notified when it moves but has already opened', async () => {
    const { create, publish, drafts, doors, clock } = setup();
    const calendar = await create.execute(SETTINGS);
    const door = new TestData().draftDoor(calendar.id, { opensOn: '2026-11-15' });
    await drafts.create(door);
    await publish.execute({ calendarId: calendar.id });
    await doors.save({ ...(await doors.getById(door.id)), notifiedAt: T0 });

    clock.set(hoursAfter(T0, 48));
    await drafts.save({ ...door, opensOn: '2026-11-16' });
    await publish.execute({ calendarId: calendar.id });

    await expect(doors.getById(door.id)).resolves.toMatchObject({ notifiedAt: T0 });
  });

  it('refuses an unknown calendar', async () => {
    const { publish } = setup();
    await expect(
      publish.execute({ calendarId: new TestData().calendarId() }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ViewCalendar', () => {
  it('shows locked, ready and opened doors, with content only behind opened ones', async () => {
    const { create, view, doors } = setup();
    const calendar = await create.execute(SETTINGS);
    const data = new TestData();
    await doors.create(
      data.door(calendar.id, { number: 1, opensAt: hoursAfter(T0, -48), firstOpenedAt: T0 }),
    );
    await doors.create(data.door(calendar.id, { number: 2, opensAt: hoursAfter(T0, -24) }));
    await doors.create(data.door(calendar.id, { number: 3, opensAt: hoursAfter(T0, 1) }));

    const shown = await view.execute({ slug: 'ida-30', accessKey: calendar.accessKey });

    expect(shown).toMatchObject({
      role: 'recipient',
      slug: 'ida-30',
      title: 'Bursdagsuka',
      recipientName: 'Ida',
      now: T0,
    });
    expect(shown.doors.map((door) => door.state)).toEqual(['opened', 'ready', 'locked']);
    expect(shown.doors[2]).not.toHaveProperty('content');
  });

  it('shows a follower what she sees, her opened doors included', async () => {
    const { create, view, doors } = setup();
    const calendar = await create.execute(SETTINGS);
    const data = new TestData();
    await doors.create(
      data.door(calendar.id, { number: 1, opensAt: hoursAfter(T0, -48), firstOpenedAt: T0 }),
    );
    await doors.create(data.door(calendar.id, { number: 2, opensAt: hoursAfter(T0, 1) }));

    const shown = await view.execute({ slug: 'ida-30', accessKey: calendar.followerKey });

    expect(shown.role).toBe('follower');
    expect(shown.doors.map((door) => door.state)).toEqual(['opened', 'locked']);
  });

  it('leaves a secret door out until it opens, also from the countdown', async () => {
    const { create, view, doors, clock } = setup();
    const calendar = await create.execute(SETTINGS);
    const data = new TestData();
    await doors.create(data.door(calendar.id, { number: 1, opensAt: hoursAfter(T0, -1) }));
    await doors.create(
      data.door(calendar.id, { number: 2, opensAt: hoursAfter(T0, 24), hidden: true }),
    );
    const access = { slug: calendar.slug, accessKey: calendar.accessKey };

    await expect(view.execute(access)).resolves.toMatchObject({ doors: [{ number: 1 }] });
    clock.set(hoursAfter(T0, 24));
    await expect(view.execute(access)).resolves.toMatchObject({
      doors: [{ number: 1 }, { number: 2, state: 'ready' }],
    });
  });

  it('refuses a wrong key and an unknown slug alike', async () => {
    const { create, view } = setup();
    await create.execute(SETTINGS);

    await expect(view.execute({ slug: 'ida-30', accessKey: 'guess' })).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(view.execute({ slug: 'nope', accessKey: 'secret-1' })).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });
});
