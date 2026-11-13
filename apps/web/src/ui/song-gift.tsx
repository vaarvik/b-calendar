import { useRef, useState } from 'react';
import type { RecipientCopy } from '../shared/shared.model';

interface SongGiftProps {
  readonly src: string;
  readonly copy: RecipientCopy;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return '0:00';
  }
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * The door's song, wrapped like a small present: ribbons and a bow over wrapping paper, a big
 * play button. The bow lifts off the first time she plays it.
 */
export function SongGift({ src, copy }: SongGiftProps) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [unwrapped, setUnwrapped] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const element = audio.current;
    if (element === null) {
      return;
    }
    if (element.paused) {
      setUnwrapped(true);
      void element.play();
    } else {
      element.pause();
    }
  };

  return (
    <div className={`song-gift${unwrapped ? ' song-gift--unwrapped' : ''}`}>
      <span className="song-gift__ribbon" aria-hidden="true" />
      <span className="song-gift__bow" aria-hidden="true">
        🎀
      </span>
      <button
        type="button"
        className="song-gift__play"
        onClick={toggle}
        aria-label={playing ? copy.pause : copy.listen}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="song-gift__body">
        <p className="song-gift__label">🎵 {copy.songForYou}</p>
        <input
          className="song-gift__progress"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          aria-label={copy.listen}
          onChange={(event) => {
            if (audio.current !== null) {
              audio.current.currentTime = Number(event.target.value);
            }
          }}
        />
        <p className="song-gift__time">
          {clock(time)} / {clock(duration)}
        </p>
      </div>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onTimeUpdate={(event) => {
          setTime(event.currentTarget.currentTime);
        }}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
        }}
      />
    </div>
  );
}
