import { OpensAtRecipientDoorPresenter, UrlDoorLinkClassifier } from '@b-calendar/domain';
import { T0, TestData, hoursAfter } from '@b-calendar/contracts/test-kit';
import { describe, expect, it } from 'vitest';

describe('OpensAtRecipientDoorPresenter', () => {
  const presenter = new OpensAtRecipientDoorPresenter(new UrlDoorLinkClassifier());
  const data = new TestData();
  const calendarId = data.calendarId();

  it('locks a door before its time, with no content at all', () => {
    const door = data.door(calendarId, { number: 2, opensAt: hoursAfter(T0, 1) });

    expect(presenter.present(door, T0)).toEqual({
      state: 'locked',
      number: 2,
      opensAt: door.opensAt,
      featured: false,
    });
  });

  it('keeps a door locked before its time even if it was opened before (moved by the admin)', () => {
    const door = data.door(calendarId, { opensAt: hoursAfter(T0, 1), firstOpenedAt: T0 });

    expect(presenter.present(door, T0)).toMatchObject({ state: 'locked' });
  });

  it('shows a door that has opened but was never looked behind as ready, still with no content', () => {
    const door = data.door(calendarId, { number: 3, opensAt: T0 });

    expect(presenter.present(door, T0)).toEqual({
      state: 'ready',
      number: 3,
      opensAt: T0,
      featured: false,
    });
  });

  it('shows that a door is featured even while it is locked', () => {
    const door = data.door(calendarId, { opensAt: hoursAfter(T0, 1), featured: true });

    expect(presenter.present(door, T0)).toMatchObject({ state: 'locked', featured: true });
  });

  it('keeps a door open, with its content, once she has opened it', () => {
    const door = data.door(calendarId, {
      opensAt: T0,
      firstOpenedAt: hoursAfter(T0, 1),
      content: data.content({ linkUrl: 'https://youtu.be/dQw4w9WgXcQ', confetti: true }),
    });

    expect(presenter.present(door, hoursAfter(T0, 2))).toEqual({
      state: 'opened',
      number: 1,
      opensAt: T0,
      featured: false,
      content: {
        title: 'Ta med badetøy',
        message: 'Du trenger det snart.',
        imageUrl: null,
        secondImageUrl: null,
        videoUrl: null,
        audioUrl: null,
        countdown: null,
        confetti: true,
        link: {
          url: 'https://youtu.be/dQw4w9WgXcQ',
          kind: 'youtube',
          embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        },
      },
    });
  });

  it('gives content without a link when there is none', () => {
    expect(presenter.content(data.content()).link).toBeNull();
  });

  it('hides a secret door completely until it opens, then shows it like any other', () => {
    const door = data.door(calendarId, { number: 6, opensAt: hoursAfter(T0, 1), hidden: true });

    expect(presenter.present(door, T0)).toBeNull();
    expect(presenter.present(door, hoursAfter(T0, 1))).toEqual({
      state: 'ready',
      number: 6,
      opensAt: door.opensAt,
      featured: false,
    });
  });
});
