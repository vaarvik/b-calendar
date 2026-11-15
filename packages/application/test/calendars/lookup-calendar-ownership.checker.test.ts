import { LookupCalendarOwnershipChecker } from '@b-calendar/application';
import { NotFoundError } from '@b-calendar/contracts';
import { TestData } from '@b-calendar/contracts/test-kit';
import {
  InMemoryCalendarRepository,
  InMemoryDoorCommentRepository,
  InMemoryDoorRepository,
  InMemoryDraftDoorRepository,
  InMemoryMemberRepository,
} from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';

async function setup() {
  const data = new TestData();
  const calendars = new InMemoryCalendarRepository();
  const drafts = new InMemoryDraftDoorRepository();
  const doors = new InMemoryDoorRepository();
  const members = new InMemoryMemberRepository();
  const comments = new InMemoryDoorCommentRepository();
  const owner = data.accountId();
  const mine = data.calendar({ ownerId: owner });
  const theirs = data.calendar({ ownerId: data.accountId() });
  const unowned = data.calendar();
  for (const calendar of [mine, theirs, unowned]) {
    await calendars.create(calendar);
  }
  const draft = data.draftDoor(mine.id);
  await drafts.create(draft);
  const published = data.door(mine.id);
  await doors.create(published);
  const theirDoor = data.door(theirs.id);
  await doors.create(theirDoor);
  const member = data.member(mine.id);
  await members.create(member);
  const theirMember = data.member(theirs.id);
  await members.create(theirMember);
  const comment = data.comment(published.id);
  await comments.create(comment);
  const theirComment = data.comment(theirDoor.id);
  await comments.create(theirComment);
  return {
    data,
    owner,
    mine,
    theirs,
    unowned,
    draft,
    published,
    theirDoor,
    member,
    theirMember,
    comment,
    theirComment,
    checker: new LookupCalendarOwnershipChecker(calendars, drafts, doors, members, comments),
  };
}

describe('LookupCalendarOwnershipChecker', () => {
  it('finds the owner’s calendar through itself, a draft or published door, a member and a comment', async () => {
    const t = await setup();

    await expect(t.checker.calendar(t.owner, t.mine.id)).resolves.toEqual(t.mine);
    await expect(t.checker.door(t.owner, t.draft.id)).resolves.toEqual(t.mine);
    await expect(t.checker.door(t.owner, t.published.id)).resolves.toEqual(t.mine);
    await expect(t.checker.member(t.owner, t.member.id)).resolves.toEqual(t.mine);
    await expect(t.checker.comment(t.owner, t.comment.id)).resolves.toEqual(t.mine);
    await expect(t.checker.calendar(null, t.unowned.id)).resolves.toEqual(t.unowned);
  });

  it('answers someone else’s things like things that do not exist', async () => {
    const t = await setup();

    for (const attempt of [
      t.checker.calendar(t.owner, t.theirs.id),
      t.checker.calendar(null, t.mine.id),
      t.checker.calendar(t.owner, t.unowned.id),
      t.checker.door(t.owner, t.theirDoor.id),
      t.checker.door(t.owner, t.data.doorId()),
      t.checker.member(t.owner, t.theirMember.id),
      t.checker.comment(t.owner, t.theirComment.id),
      t.checker.comment(t.owner, t.data.commentId()),
    ]) {
      await expect(attempt).rejects.toBeInstanceOf(NotFoundError);
    }
  });
});
