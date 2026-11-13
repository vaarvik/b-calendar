import { useEffect, useMemo, useState } from 'react';
import type {
  CalendarDetailsResponseDto,
  DoorPreviewDto,
  OpenDoorContentDto,
  RecipientDoorDto,
} from '@b-calendar/contracts';
import { INTL_LOCALE, RECIPIENT_COPY } from '../shared/shared.model';
import { Countdown } from '../ui/countdown';
import { DoorSheet } from '../ui/door-sheet';
import { DoorTile } from '../ui/door-tile';

const SWING_MS = 900;

interface CalendarPreviewScreenProps {
  readonly calendarId: string;
  readonly load: (calendarId: string) => Promise<CalendarDetailsResponseDto>;
  readonly onError: (error: unknown) => void;
  readonly onBack: () => void;
}

function contentOf(door: DoorPreviewDto): OpenDoorContentDto {
  const { title, message, imageUrl, videoUrl, audioUrl, countdown, confetti } = door.content;
  return { title, message, imageUrl, videoUrl, audioUrl, countdown, confetti, link: door.link };
}

/** The door as she sees it right now, or opened when the admin has revealed it here. */
function asRecipient(door: DoorPreviewDto, now: number, revealed: boolean): RecipientDoorDto {
  const { number, opensAt, featured } = door;
  if (revealed || (door.firstOpenedAt !== null && Date.parse(opensAt) <= now)) {
    return { state: 'opened', number, opensAt, featured, content: contentOf(door) };
  }
  return { state: Date.parse(opensAt) > now ? 'locked' : 'ready', number, opensAt, featured };
}

/**
 * The calendar as the recipient sees it, for the admin. Any door can be opened, locked or not.
 * Nothing is recorded: opening here does not count as her opening it.
 */
export function CalendarPreviewScreen({
  calendarId,
  load,
  onError,
  onBack,
}: CalendarPreviewScreenProps) {
  const [details, setDetails] = useState<CalendarDetailsResponseDto | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set());
  const [opening, setOpening] = useState<number | null>(null);
  const [shown, setShown] = useState<DoorPreviewDto | null>(null);

  useEffect(() => {
    load(calendarId).then(setDetails, onError);
  }, [calendarId, load, onError]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const locale = details?.calendar.locale ?? 'nb';
  const copy = RECIPIENT_COPY[locale];
  const format = useMemo(
    () =>
      new Intl.DateTimeFormat(INTL_LOCALE[locale], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  useEffect(() => {
    if (details !== null) {
      document.documentElement.dataset.theme = details.calendar.theme;
    }
  }, [details]);

  if (details === null) {
    return (
      <main className="empty-state">
        <p className="empty-state__mark loading">🎁</p>
      </main>
    );
  }

  const { calendar, doors } = details;
  // Her countdown skips secret doors, so this one does too.
  const nextLocked = doors.find((door) => !door.hidden && Date.parse(door.opensAt) > now);

  const reveal = (door: DoorPreviewDto) => {
    if (revealed.has(door.number) || asRecipient(door, now, false).state === 'opened') {
      setShown(door);
      return;
    }
    setOpening(door.number);
    setTimeout(() => {
      setRevealed((current) => new Set(current).add(door.number));
      setOpening(null);
      setShown(door);
    }, SWING_MS);
  };

  return (
    <main className="calendar">
      <div className="preview-bar">
        <span>Forhåndsvisning · bare du ser dette, ingenting registreres</span>
        <span className="admin__row">
          <button
            className="button button--ghost"
            onClick={() => {
              setRevealed(new Set(doors.map((door) => door.number)));
            }}
          >
            Åpne alle
          </button>
          <button
            className="button button--ghost"
            onClick={() => {
              setRevealed(new Set());
            }}
          >
            Lukk alle
          </button>
          <button className="button button--ghost" onClick={onBack}>
            Tilbake
          </button>
        </span>
      </div>

      <header className="calendar__header">
        <p className="calendar__hello">{copy.hello(calendar.recipientName)}</p>
        <h1 className="calendar__title">{calendar.title}</h1>
        {nextLocked === undefined ? (
          <p className="calendar__next">{copy.allOpen}</p>
        ) : (
          <div className="calendar__next">
            <p className="calendar__next-label">{copy.nextDoorIn}</p>
            <Countdown to={Date.parse(nextLocked.opensAt)} now={now} copy={copy} />
          </div>
        )}
      </header>

      <section className="doors" aria-label={calendar.title}>
        {doors.map((door) => (
          <DoorTile
            key={door.id}
            door={asRecipient(door, now, revealed.has(door.number))}
            opening={opening === door.number}
            shaking={false}
            when={format.format(Date.parse(door.opensAt))}
            copy={copy}
            onTap={() => {
              reveal(door);
            }}
            secret={door.hidden && Date.parse(door.opensAt) > now && !revealed.has(door.number)}
          />
        ))}
      </section>

      {shown !== null && (
        <DoorSheet
          number={shown.number}
          content={contentOf(shown)}
          now={now}
          copy={copy}
          onClose={() => {
            setShown(null);
          }}
        />
      )}
    </main>
  );
}
