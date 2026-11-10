import { LinkDoorPreviewPresenter, UrlDoorLinkClassifier } from '@b-calendar/domain';
import { TestData } from '@b-calendar/contracts/test-kit';
import { describe, expect, it } from 'vitest';

describe('LinkDoorPreviewPresenter', () => {
  const presenter = new LinkDoorPreviewPresenter(new UrlDoorLinkClassifier());
  const data = new TestData();

  it('adds the classified link', () => {
    const door = data.door(data.calendarId(), {
      content: data.content({ linkUrl: 'https://example.com/x' }),
    });

    expect(presenter.preview(door)).toEqual({
      ...door,
      link: { url: 'https://example.com/x', kind: 'web', embedUrl: null },
    });
  });

  it('has no link when the door has none', () => {
    expect(presenter.preview(data.door(data.calendarId())).link).toBeNull();
  });
});
