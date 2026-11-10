import type { RecipientDoorDto } from '@b-calendar/contracts';
import type { RecipientCopy } from '../shared/shared.model';

interface DoorTileProps {
  readonly door: RecipientDoorDto;
  /** The door is swinging open right now. */
  readonly opening: boolean;
  readonly when: string;
  readonly copy: RecipientCopy;
  readonly onTap: () => void;
}

/** One hatch: closed with its number, glowing when ready, swung open once opened. */
export function DoorTile({ door, opening, when, copy, onTap }: DoorTileProps) {
  const open = door.state === 'opened' || opening;
  const inside = door.state === 'opened' ? door.content : null;
  return (
    <button
      className={`door door--${door.state}${open ? ' door--open' : ''}`}
      onClick={onTap}
      aria-label={`${copy.door(door.number)}, ${door.state === 'locked' ? copy.opensAt(when) : copy.open}`}
    >
      <span className="door__inside">
        {inside?.imageUrl != null ? (
          <img className="door__thumb" src={inside.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="door__glyph">{inside?.link != null ? '♫' : '✦'}</span>
        )}
        {inside !== null && <span className="door__caption">{inside.title}</span>}
      </span>
      <span className="door__panel">
        <span className="door__number">{door.number}</span>
        {door.state === 'locked' && <span className="door__when">{when}</span>}
        {door.state === 'ready' && <span className="door__cta">{copy.open}</span>}
        {door.state === 'locked' && (
          <span className="door__lock" aria-hidden="true">
            🔒
          </span>
        )}
      </span>
    </button>
  );
}
