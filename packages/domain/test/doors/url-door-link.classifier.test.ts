import { UrlDoorLinkClassifier } from '@b-calendar/domain';
import { describe, expect, it } from 'vitest';

describe('UrlDoorLinkClassifier', () => {
  const classifier = new UrlDoorLinkClassifier();

  it.each([
    [
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc',
      'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    ],
    [
      'https://open.spotify.com/intl-no/track/4uLU6hMCjMI75M1A2tKUQC',
      'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    ],
    [
      'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
    ],
  ])('embeds the Spotify link %s', (url, embedUrl) => {
    expect(classifier.classify(url)).toEqual({ url, kind: 'spotify', embedUrl });
  });

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=x',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ])('embeds the YouTube link %s', (url) => {
    expect(classifier.classify(url)).toEqual({
      url,
      kind: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it.each([
    'https://example.com/a',
    'https://open.spotify.com/',
    'https://open.spotify.com/user/x',
    'https://www.youtube.com/watch',
    'https://youtu.be/',
    'not a url',
  ])('keeps %s as a plain link', (url) => {
    expect(classifier.classify(url)).toEqual({ url, kind: 'web', embedUrl: null });
  });
});
