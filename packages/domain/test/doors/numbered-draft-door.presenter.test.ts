import {
  LinkDoorPreviewPresenter,
  NumberedDraftDoorPresenter,
  OpensAtDoorNumberCalculator,
  UrlDoorLinkClassifier,
  ZonedDoorScheduleCalculator,
} from '@b-calendar/domain';
import { NotFoundError } from '@b-calendar/contracts';
import { T0, TestData, hoursAfter } from '@b-calendar/contracts/test-kit';
import { describe, expect, it } from 'vitest';

describe('NumberedDraftDoorPresenter', () => {
  const presenter = new NumberedDraftDoorPresenter(
    new ZonedDoorScheduleCalculator(),
    new OpensAtDoorNumberCalculator(),
    new LinkDoorPreviewPresenter(new UrlDoorLinkClassifier()),
  );
  const data = new TestData();
  const calendar = data.calendar();

  it('schedules each draft door in the calendar’s time zone, at its own time or the default', () => {
    const own = data.draftDoor(calendar.id, { opensOn: '2026-11-16', openTime: '17:30' });
    const byDefault = data.draftDoor(calendar.id, { opensOn: '2026-11-15' });

    const [first, second] = presenter.present(calendar, [own, byDefault], []);

    expect(first).toMatchObject({ id: byDefault.id, number: 1, opensAt: T0 });
    expect(second).toMatchObject({
      id: own.id,
      number: 2,
      opensAt: new Date('2026-11-16T16:30:00.000Z'),
    });
  });

  it('carries every field of the draft, with its link classified and no progress', () => {
    const draft = data.draftDoor(calendar.id, {
      featured: true,
      content: data.content({ linkUrl: 'https://example.com/x' }),
    });

    const { id, calendarId, opensOn, openTime, featured, hidden, content, notification } = draft;
    expect(presenter.present(calendar, [draft], [])).toEqual([
      {
        id,
        calendarId,
        opensOn,
        openTime,
        featured,
        hidden,
        content,
        notification,
        number: 1,
        opensAt: T0,
        notifiedAt: null,
        firstOpenedAt: null,
        link: { url: 'https://example.com/x', kind: 'web', embedUrl: null },
      },
    ]);
  });

  it('takes the recipient’s progress from the published door of the same id', () => {
    const draft = data.draftDoor(calendar.id);
    const published = data.door(calendar.id, {
      id: draft.id,
      notifiedAt: T0,
      firstOpenedAt: hoursAfter(T0, 1),
    });

    expect(presenter.present(calendar, [draft], [published])[0]).toMatchObject({
      notifiedAt: T0,
      firstOpenedAt: hoursAfter(T0, 1),
    });
  });

  it('presents one draft door numbered among the others, and refuses an unknown id', () => {
    const later = data.draftDoor(calendar.id, { opensOn: '2026-11-17' });
    const first = data.draftDoor(calendar.id);

    expect(presenter.presentOne(calendar, [later, first], [], later.id)).toMatchObject({
      id: later.id,
      number: 2,
    });
    expect(() => presenter.presentOne(calendar, [first], [], later.id)).toThrow(NotFoundError);
  });
});
