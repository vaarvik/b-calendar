import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CalendarAccess,
  OpenDoorContentDto,
  RecipientCalendarResponseDto,
} from '@b-calendar/contracts';
import type { PushReadiness } from '../notifications/notifications.ports';
import { ApiError } from '../shared/shared.model';
import { INTL_LOCALE, RECIPIENT_COPY } from '../shared/shared.model';
import { Countdown } from '../ui/countdown';
import { DoorSheet } from '../ui/door-sheet';
import { DoorTile } from '../ui/door-tile';
import { NotifyCard } from '../ui/notify-card';
import { useServices } from './services';

const SWING_MS = 900;

interface Shown {
  readonly number: number;
  readonly content: OpenDoorContentDto;
}

/** Ticks once a second with the server's clock, corrected for the phone's. */
function useServerNow(offset: number): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now() + offset);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [offset]);
  return now;
}

export function CalendarScreen({ slug }: { readonly slug: string }) {
  const services = useServices();
  const access = useMemo<CalendarAccess | null>(() => {
    const fromUrl = new URLSearchParams(location.search).get('k');
    const accessKey = fromUrl ?? services.keys.find(slug);
    return accessKey === null ? null : { slug, accessKey };
  }, [services, slug]);

  const [calendar, setCalendar] = useState<RecipientCalendarResponseDto | null>(null);
  const [offset, setOffset] = useState(0);
  const [problem, setProblem] = useState<'bad-link' | 'offline' | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [shaking, setShaking] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<PushReadiness>(() => services.push.readiness());
  const [subscribing, setSubscribing] = useState(false);
  const autoOpened = useRef(false);
  const now = useServerNow(offset);

  const copy = RECIPIENT_COPY[calendar?.locale ?? 'nb'];
  const format = useMemo(
    () =>
      new Intl.DateTimeFormat(INTL_LOCALE[calendar?.locale ?? 'nb'], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        // The day only: the time of day stays a surprise.
      }),
    [calendar?.locale],
  );

  const load = useCallback((): Promise<void> => {
    if (access === null) {
      return Promise.resolve();
    }
    return services.calendars.view(access).then(
      (view) => {
        setOffset(Date.parse(view.now) - Date.now());
        setCalendar(view);
        setProblem(null);
        services.keys.save(access);
      },
      (error: unknown) => {
        setProblem(error instanceof ApiError && error.status === 401 ? 'bad-link' : 'offline');
      },
    );
  }, [access, services]);

  // Load, reload when she comes back to the app, retry while offline.
  useEffect(() => {
    void load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setReadiness(services.push.readiness());
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, services]);

  useEffect(() => {
    if (problem !== 'offline') {
      return undefined;
    }
    const timer = setTimeout(() => void load(), 5000);
    return () => {
      clearTimeout(timer);
    };
  }, [problem, load]);

  // A locked door whose time has come: ask the server again.
  const nextLocked = calendar?.doors.find((door) => door.state === 'locked') ?? null;
  const nextOpensAt = nextLocked === null ? null : Date.parse(nextLocked.opensAt);
  useEffect(() => {
    if (nextOpensAt !== null && now >= nextOpensAt) {
      void load();
    }
  }, [now, nextOpensAt, load]);

  // "Add to Home Screen" must keep the key: point the manifest at this calendar.
  useEffect(() => {
    if (access === null) {
      return;
    }
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link === null) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.append(link);
    }
    link.href = `/c/${encodeURIComponent(slug)}/manifest.webmanifest?k=${encodeURIComponent(access.accessKey)}`;
    if (!new URLSearchParams(location.search).has('k')) {
      history.replaceState(
        null,
        '',
        `/c/${encodeURIComponent(slug)}?k=${encodeURIComponent(access.accessKey)}`,
      );
    }
  }, [access, slug]);

  useEffect(() => {
    if (calendar !== null) {
      document.title = calendar.title;
      document.documentElement.dataset.theme = calendar.theme;
      document.documentElement.lang = calendar.locale;
    }
  }, [calendar]);

  const openDoor = useCallback(
    async (number: number) => {
      const door = calendar?.doors.find((candidate) => candidate.number === number);
      if (door === undefined || access === null) {
        return;
      }
      if (door.state === 'locked') {
        setShaking(number);
        setTimeout(() => {
          setShaking(null);
        }, 600);
        return;
      }
      if (door.state === 'opened') {
        setShown({ number, content: door.content });
        return;
      }
      setOpening(number);
      try {
        const [opened] = await Promise.all([
          services.calendars.open(access, number),
          new Promise((resolve) => setTimeout(resolve, SWING_MS)),
        ]);
        setCalendar((current) =>
          current === null
            ? current
            : {
                ...current,
                doors: current.doors.map((candidate) =>
                  candidate.number === number
                    ? {
                        state: 'opened',
                        featured: candidate.featured,
                        number,
                        opensAt: candidate.opensAt,
                        content: opened.content,
                      }
                    : candidate,
                ),
              },
        );
        setShown({ number, content: opened.content });
      } catch {
        void load();
      } finally {
        setOpening(null);
      }
    },
    [access, calendar, load, services],
  );

  // A tapped notification opens its door: /c/<slug>?k=…&door=3.
  useEffect(() => {
    const wanted = Number(new URLSearchParams(location.search).get('door'));
    if (calendar === null || autoOpened.current || !Number.isInteger(wanted) || wanted < 1) {
      return;
    }
    autoOpened.current = true;
    void openDoor(wanted);
  }, [calendar, openDoor]);

  const enableNotifications = async () => {
    if (access === null) {
      return;
    }
    setSubscribing(true);
    try {
      const key = await services.calendars.vapidPublicKey();
      if (key !== null) {
        const endpoint = await services.push.subscribe(key);
        if (endpoint !== null) {
          await services.calendars.subscribe(access, endpoint);
        }
      }
    } finally {
      setReadiness(services.push.readiness());
      setSubscribing(false);
    }
  };

  if (access === null || problem === 'bad-link') {
    return (
      <main className="empty-state">
        <p className="empty-state__mark">🔐</p>
        <p>{copy.badLink}</p>
      </main>
    );
  }
  if (calendar === null) {
    return (
      <main className="empty-state">
        <p className="empty-state__mark loading">🎁</p>
        {problem === 'offline' && <p>{copy.offline}</p>}
      </main>
    );
  }

  return (
    <main className="calendar">
      <header className="calendar__header">
        {calendar.role === 'follower' ? (
          <p className="calendar__following">{copy.following(calendar.recipientName)}</p>
        ) : (
          <p className="calendar__hello">{copy.hello(calendar.recipientName)}</p>
        )}
        <h1 className="calendar__title">{calendar.title}</h1>
        {calendar.doors.length === 0 ? (
          <p className="calendar__next">{copy.comingSoon}</p>
        ) : nextOpensAt === null ? (
          <p className="calendar__next">{copy.allOpen}</p>
        ) : (
          <div className="calendar__next">
            <p className="calendar__next-label">{copy.nextDoorIn}</p>
            <Countdown to={nextOpensAt} now={now} copy={copy} />
          </div>
        )}
      </header>

      <NotifyCard
        readiness={readiness}
        busy={subscribing}
        copy={copy}
        onEnable={() => void enableNotifications()}
      />

      <section className="doors" aria-label={calendar.title}>
        {calendar.doors.map((door) => (
          <DoorTile
            key={door.number}
            door={door}
            opening={opening === door.number}
            shaking={shaking === door.number}
            when={format.format(Date.parse(door.opensAt))}
            copy={copy}
            onTap={() => void openDoor(door.number)}
          />
        ))}
      </section>
      {problem === 'offline' && <p className="calendar__offline">{copy.offline}</p>}

      {shown !== null && (
        <DoorSheet
          number={shown.number}
          content={shown.content}
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
