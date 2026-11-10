import {
  CreateCalendarUseCase,
  GetCalendarDetailsUseCase,
  KeyCalendarAccessAuthenticator,
  ListCalendarsUseCase,
  RotateCalendarKeyUseCase,
  UpdateCalendarUseCase,
  ViewCalendarUseCase,
  ZodInputValidator,
} from '@b-calendar/application';
import { ConflictError, UnauthenticatedError, ValidationError } from '@b-calendar/contracts';
import type { CalendarSettings } from '@b-calendar/contracts';
import { T0, TestData, hoursAfter } from '@b-calendar/contracts/test-kit';
import {
  ConstantTimeSecretMatcher,
  LinkDoorPreviewPresenter,
  OpensAtRecipientDoorPresenter,
  UrlDoorLinkClassifier,
} from '@b-calendar/domain';
import {
  InMemoryCalendarRepository,
  InMemoryDoorRepository,
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
};

function setup() {
  const calendars = new InMemoryCalendarRepository();
  const doors = new InMemoryDoorRepository();
  const subscriptions = new InMemorySubscriptionRepository();
  const clock = new ManualClock();
  const validator = new ZodInputValidator();
  const secrets = new CountingSecrets();
  const links = new UrlDoorLinkClassifier();
  const access = new KeyCalendarAccessAuthenticator(calendars, new ConstantTimeSecretMatcher());
  return {
    calendars,
    doors,
    subscriptions,
    clock,
    create: new CreateCalendarUseCase(calendars, new RandomIds(), secrets, clock, validator),
    update: new UpdateCalendarUseCase(calendars, calendars, validator),
    rotate: new RotateCalendarKeyUseCase(calendars, calendars, secrets),
    list: new ListCalendarsUseCase(calendars),
    details: new GetCalendarDetailsUseCase(
      calendars,
      doors,
      subscriptions,
      new LinkDoorPreviewPresenter(links),
    ),
    view: new ViewCalendarUseCase(access, doors, new OpensAtRecipientDoorPresenter(links), clock),
  };
}

describe('CreateCalendar', () => {
  it('creates a calendar with a fresh access key', async () => {
    const { create, calendars } = setup();

    const calendar = await create.execute(SETTINGS);

    expect(calendar).toMatchObject({ ...SETTINGS, accessKey: 'secret-1', createdAt: T0 });
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

  it('gives a new key', async () => {
    const { create, rotate } = setup();
    const calendar = await create.execute(SETTINGS);

    await expect(rotate.execute({ calendarId: calendar.id })).resolves.toEqual({
      ...calendar,
      accessKey: 'secret-2',
    });
  });
});

describe('ListCalendars and GetCalendarDetails', () => {
  it('lists calendars and shows one with every door in full and its subscriber count', async () => {
    const { create, list, details, doors, subscriptions } = setup();
    const calendar = await create.execute(SETTINGS);
    const data = new TestData();
    const door = data.door(calendar.id, {
      opensAt: hoursAfter(T0, 10),
      content: data.content({ linkUrl: 'https://youtu.be/dQw4w9WgXcQ' }),
    });
    await doors.create(door);
    await subscriptions.upsert(data.subscription(calendar.id));

    await expect(list.execute()).resolves.toEqual([calendar]);
    const shown = await details.execute({ calendarId: calendar.id });
    expect(shown.calendar).toEqual(calendar);
    expect(shown.subscriberCount).toBe(1);
    expect(shown.doors).toHaveLength(1);
    expect(shown.doors[0]).toMatchObject({ ...door, link: { kind: 'youtube' } });
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
      slug: 'ida-30',
      title: 'Bursdagsuka',
      recipientName: 'Ida',
      now: T0,
    });
    expect(shown.doors.map((door) => door.state)).toEqual(['opened', 'ready', 'locked']);
    expect(shown.doors[2]).not.toHaveProperty('content');
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
