import { LinkDoorPreviewPresenter, UrlDoorLinkClassifier } from '@b-calendar/domain';
import { TestData } from '@b-calendar/contracts/test-kit';
import { describe, expect, it } from 'vitest';

describe('LinkDoorPreviewPresenter', () => {
  const presenter = new LinkDoorPreviewPresenter(new UrlDoorLinkClassifier());
  const data = new TestData();

  it('adds the classified link and who has opened the door, leaving other doors’ openings out', () => {
    const door = data.door(data.calendarId(), {
      content: data.content({ linkUrl: 'https://example.com/x' }),
    });
    const mine = data.opening(door.id, data.memberId());
    const other = data.opening(data.doorId(), data.memberId());

    expect(presenter.preview(door, [other, mine])).toEqual({
      ...door,
      link: { url: 'https://example.com/x', kind: 'web', embedUrl: null },
      openings: [mine],
    });
  });

  it('has no link when the door has none', () => {
    expect(presenter.preview(data.door(data.calendarId()), []).link).toBeNull();
  });
});
