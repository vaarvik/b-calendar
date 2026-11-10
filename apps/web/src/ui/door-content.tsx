import type { OpenDoorContentDto } from '@b-calendar/contracts';
import type { RecipientCopy } from '../shared/shared.model';
import { Countdown } from './countdown';

interface DoorContentProps {
  readonly content: OpenDoorContentDto;
  readonly now: number;
  readonly copy: RecipientCopy;
}

/** What is behind a door: words, a picture, a song or video, a countdown. */
export function DoorContent({ content, now, copy }: DoorContentProps) {
  const { link, countdown } = content;
  return (
    <div className="door-content">
      <h2 className="door-content__title">{content.title}</h2>
      {content.message !== '' && <p className="door-content__message">{content.message}</p>}
      {content.imageUrl !== null && (
        <figure className="photo-frame">
          <img className="photo-frame__image" src={content.imageUrl} alt="" loading="lazy" />
        </figure>
      )}
      {countdown !== null && (
        <div className="door-content__countdown">
          <Countdown to={Date.parse(countdown.to)} now={now} copy={copy} />
          {countdown.label !== '' && (
            <p className="door-content__countdown-label">{countdown.label}</p>
          )}
        </div>
      )}
      {link?.kind === 'spotify' && link.embedUrl !== null && (
        <iframe
          className="door-content__embed door-content__embed--spotify"
          src={link.embedUrl}
          title={copy.listen}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
      {link?.kind === 'youtube' && link.embedUrl !== null && (
        <iframe
          className="door-content__embed door-content__embed--video"
          src={link.embedUrl}
          title={copy.listen}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      )}
      {link !== null && (
        <a className="button button--ghost" href={link.url} target="_blank" rel="noreferrer">
          {copy.openLink} ↗
        </a>
      )}
    </div>
  );
}
