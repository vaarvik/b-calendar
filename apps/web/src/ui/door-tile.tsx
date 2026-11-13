import type { RecipientDoorDto } from '@b-calendar/contracts';
import type { RecipientCopy } from '../shared/shared.model';

interface DoorTileProps {
  readonly door: RecipientDoorDto;
  /** The door is opening right now. */
  readonly opening: boolean;
  /** She tapped a locked door: shake it. */
  readonly shaking: boolean;
  readonly when: string;
  readonly copy: RecipientCopy;
  readonly onTap: () => void;
  /** Admin preview only: a secret door she cannot see yet. */
  readonly secret?: boolean;
}

/**
 * One hatch: closed with its number, glowing when ready, open once opened. A featured hatch is a
 * wide wrapped present whose lid flies off; the others swing open like a door.
 */
export function DoorTile({
  door,
  opening,
  shaking,
  when,
  copy,
  onTap,
  secret = false,
}: DoorTileProps) {
  const inside = door.state === 'opened' ? door.content : null;
  const classes = [
    'door',
    `door--${door.state}`,
    door.featured ? 'door--featured' : '',
    opening ? 'door--opening' : '',
    door.state === 'opened' || opening ? 'door--open' : '',
    shaking ? 'shake' : '',
    secret ? 'door--secret' : '',
  ].filter((name) => name !== '');
  return (
    <button
      className={classes.join(' ')}
      onClick={onTap}
      aria-label={`${copy.door(door.number)}, ${door.state === 'locked' ? copy.opensAt(when) : copy.open}`}
    >
      <span className="door__inside">
        {inside?.imageUrl != null ? (
          <span className="door__photo">
            <img src={inside.imageUrl} alt="" loading="lazy" />
          </span>
        ) : (
          <span className="door__glyph">
            {door.featured ? '🎉' : inside?.link != null ? '♫' : '✦'}
          </span>
        )}
        {inside !== null && <span className="door__caption">{inside.title}</span>}
      </span>
      {secret && <span className="door__secret">🤫 Hemmelig – hun ser den ikke ennå</span>}
      <span className="door__panel">
        {door.featured && (
          <>
            <span className="door__ribbon door__ribbon--vertical" aria-hidden="true" />
            <span className="door__ribbon door__ribbon--horizontal" aria-hidden="true" />
            <span className="door__bow" aria-hidden="true">
              🎀
            </span>
            <span className="door__sparkle door__sparkle--1" aria-hidden="true">
              ✦
            </span>
            <span className="door__sparkle door__sparkle--2" aria-hidden="true">
              ✧
            </span>
            <span className="door__sparkle door__sparkle--3" aria-hidden="true">
              ✦
            </span>
          </>
        )}
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
