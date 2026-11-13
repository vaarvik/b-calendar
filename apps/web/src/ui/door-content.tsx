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
  // Up to three polaroids: two photos and the video.
  const photos = [content.imageUrl, content.secondImageUrl].filter(
    (url): url is string => url !== null,
  );
  const cards = photos.length + (content.videoUrl === null ? 0 : 1);
  return (
    <div className="door-content">
      <h2 className="door-content__title">{content.title}</h2>
      {content.message !== '' && <p className="door-content__message">{content.message}</p>}
      {content.audioUrl !== null && (
        <audio className="door-content__audio" src={content.audioUrl} controls preload="none" />
      )}
      {cards > 0 && (
        <div className={`photo-pair photo-pair--${String(cards)}`}>
          {photos.map((url) => (
            <figure key={url} className="photo-frame">
              <img className="photo-frame__image" src={url} alt="" loading="lazy" />
            </figure>
          ))}
          {content.videoUrl !== null && (
            <figure className="photo-frame photo-frame--video">
              <video
                className="photo-frame__image"
                src={content.videoUrl}
                controls
                playsInline
                preload="metadata"
              />
            </figure>
          )}
        </div>
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
