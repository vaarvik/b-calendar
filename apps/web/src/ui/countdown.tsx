import type { RecipientCopy } from '../shared/shared.model';

interface CountdownProps {
  readonly to: number;
  readonly now: number;
  readonly copy: RecipientCopy;
  readonly size?: 'large' | 'small';
}

/** Days, hours, minutes and seconds left; "now!" when the time has come. */
export function Countdown({ to, now, copy, size = 'large' }: CountdownProps) {
  const left = Math.max(0, Math.floor((to - now) / 1000));
  if (left === 0) {
    return <p className={`countdown countdown--${size} countdown--done`}>{copy.countdownDone}</p>;
  }
  const parts: [number, string][] = [
    [Math.floor(left / 86_400), copy.days],
    [Math.floor((left % 86_400) / 3600), copy.hours],
    [Math.floor((left % 3600) / 60), copy.minutes],
    [left % 60, copy.seconds],
  ];
  const shown = parts[0]?.[0] === 0 ? parts.slice(1) : parts;
  return (
    <p className={`countdown countdown--${size}`} role="timer">
      {shown.map(([value, unit]) => (
        <span className="countdown__part" key={unit}>
          <span className="countdown__value">{String(value).padStart(2, '0')}</span>
          <span className="countdown__unit">{unit}</span>
        </span>
      ))}
    </p>
  );
}
