import {
  AddDoorCommentUseCase,
  KeyCalendarAccessAuthenticator,
  ListAdminDoorCommentsUseCase,
  ListDoorCommentsUseCase,
  RemoveDoorCommentUseCase,
  VisibleOpenedDoorLocator,
  ZodInputValidator,
} from '@b-calendar/application';
import {
  DoorLockedError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from '@b-calendar/contracts';
import { T0, TestData, hoursAfter } from '@b-calendar/contracts/test-kit';
import {
  ConstantTimeSecretMatcher,
  OpensAtRecipientDoorPresenter,
  UrlDoorLinkClassifier,
} from '@b-calendar/domain';
import {
  InMemoryCalendarRepository,
  InMemoryDoorCommentRepository,
  InMemoryDoorRepository,
} from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import { ManualClock, RandomIds } from '../shared/fakes.js';

async function setup() {
  const data = new TestData();
  const calendars = new InMemoryCalendarRepository();
  const doors = new InMemoryDoorRepository();
  const comments = new InMemoryDoorCommentRepository();
  const clock = new ManualClock();
  const calendar = data.calendar({ recipientName: 'Karoline' });
  await calendars.create(calendar);
  const open = data.door(calendar.id, { number: 1, opensAt: hoursAfter(T0, -1) });
  const locked = data.door(calendar.id, { number: 2, opensAt: hoursAfter(T0, 1) });
  const secret = data.door(calendar.id, { number: 3, opensAt: hoursAfter(T0, 2), hidden: true });
  for (const door of [open, locked, secret]) {
    await doors.create(door);
  }
  const locator = new VisibleOpenedDoorLocator(
    new KeyCalendarAccessAuthenticator(calendars, new ConstantTimeSecretMatcher()),
    doors,
    new OpensAtRecipientDoorPresenter(new UrlDoorLinkClassifier()),
    clock,
  );
  return {
    data,
    calendar,
    open,
    comments,
    clock,
    hers: { slug: calendar.slug, accessKey: calendar.accessKey },
    followers: { slug: calendar.slug, accessKey: calendar.followerKey },
    add: new AddDoorCommentUseCase(
      locator,
      comments,
      new RandomIds(),
      clock,
      new ZodInputValidator(),
    ),
    list: new ListDoorCommentsUseCase(locator, comments),
    listAdmin: new ListAdminDoorCommentsUseCase(comments),
    remove: new RemoveDoorCommentUseCase(comments),
  };
}

describe('AddDoorComment and ListDoorComments', () => {
  it('writes her comments with her name, and a follower’s with the name they gave', async () => {
    const { add, list, hers, followers, clock } = await setup();

    await add.execute({ ...hers, number: 1, author: 'Ignored', text: '  Gleder meg! ' });
    clock.set(hoursAfter(T0, 1));
    await add.execute({ ...followers, number: 1, author: ' Johann ', text: 'Jeg også' });

    await expect(list.execute({ ...followers, number: 1 })).resolves.toMatchObject([
      { author: 'Karoline', role: 'recipient', text: 'Gleder meg!', createdAt: T0 },
      { author: 'Johann', role: 'follower', text: 'Jeg også', createdAt: hoursAfter(T0, 1) },
    ]);
  });

  it('refuses doors that have not opened, secret ones as if they did not exist', async () => {
    const { add, list, hers } = await setup();

    await expect(add.execute({ ...hers, number: 2, text: 'Hei' })).rejects.toBeInstanceOf(
      DoorLockedError,
    );
    await expect(list.execute({ ...hers, number: 2 })).rejects.toBeInstanceOf(DoorLockedError);
    await expect(add.execute({ ...hers, number: 3, text: 'Hei' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(list.execute({ ...hers, number: 9 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('refuses an empty or too long text, a follower without a name and a wrong key', async () => {
    const { add, hers, followers } = await setup();

    await expect(add.execute({ ...hers, number: 1, text: '   ' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      add.execute({ ...hers, number: 1, text: 'x'.repeat(1001) }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(add.execute({ ...followers, number: 1, text: 'Hei' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      add.execute({ ...hers, accessKey: 'wrong', number: 1, text: 'Hei' }),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe('ListAdminDoorComments and RemoveDoorComment', () => {
  it('shows the admin a door’s comments and removes one', async () => {
    const { add, listAdmin, remove, hers, open } = await setup();
    const comment = await add.execute({ ...hers, number: 1, text: 'Fjern meg' });

    await expect(listAdmin.execute({ doorId: open.id })).resolves.toEqual([comment]);
    await remove.execute({ commentId: comment.id });
    await expect(listAdmin.execute({ doorId: open.id })).resolves.toEqual([]);
  });
});
