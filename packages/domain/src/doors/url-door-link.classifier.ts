import type { DoorLink, DoorLinkClassifier } from '@b-calendar/contracts';

const SPOTIFY_TYPES = new Set(['track', 'album', 'playlist', 'episode', 'show', 'artist']);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Spotify and YouTube links become embedded players; anything else stays a link. */
export class UrlDoorLinkClassifier implements DoorLinkClassifier {
  public classify(url: string): DoorLink {
    const parsed = URL.canParse(url) ? new URL(url) : null;
    const spotify = parsed === null ? null : this.spotify(parsed);
    if (spotify !== null) {
      return { url, kind: 'spotify', embedUrl: spotify };
    }
    const youtube = parsed === null ? null : this.youtubeId(parsed);
    if (youtube !== null) {
      return {
        url,
        kind: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtube}`,
      };
    }
    return { url, kind: 'web', embedUrl: null };
  }

  private spotify(url: URL): string | null {
    if (url.hostname !== 'open.spotify.com') {
      return null;
    }
    // `/intl-no/track/<id>` and `/track/<id>`.
    const parts = url.pathname
      .split('/')
      .filter((part) => part !== '' && !part.startsWith('intl-'));
    const [type, id] = parts;
    if (type === undefined || id === undefined || !SPOTIFY_TYPES.has(type)) {
      return null;
    }
    return `https://open.spotify.com/embed/${type}/${id}`;
  }

  private youtubeId(url: URL): string | null {
    const host = url.hostname.replace(/^(www|m)\./, '');
    const candidate =
      host === 'youtu.be'
        ? url.pathname.slice(1)
        : host === 'youtube.com'
          ? (url.searchParams.get('v') ?? /^\/shorts\/([^/]+)/.exec(url.pathname)?.[1])
          : undefined;
    return candidate !== undefined && YOUTUBE_ID.test(candidate) ? candidate : null;
  }
}
