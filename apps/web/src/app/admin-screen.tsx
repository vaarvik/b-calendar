import { useCallback, useEffect, useState } from 'react';
import type {
  CalendarDetailsResponseDto,
  CalendarDto,
  CalendarSettings,
  OpenDoorContentDto,
} from '@b-calendar/contracts';
import type { DoorDraftDto } from '../admin/admin.ports';
import { ApiError } from '../shared/shared.model';
import { RECIPIENT_COPY } from '../shared/shared.model';
import { DoorForm } from '../ui/door-form';
import { DoorSheet } from '../ui/door-sheet';
import { CalendarPreviewScreen } from './calendar-preview-screen';
import { useServices } from './services';

const DAY = 86_400_000;

function navigate(path: string): void {
  history.pushState(null, '', path);
  dispatchEvent(new PopStateEvent('popstate'));
}

function usePath(): string {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const onPop = () => {
      setPath(location.pathname);
    };
    addEventListener('popstate', onPop);
    return () => {
      removeEventListener('popstate', onPop);
    };
  }, []);
  return path;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Noe gikk galt.';
}

export function AdminScreen() {
  const { admin } = useServices();
  const [signedIn, setSignedIn] = useState(admin.signedIn());
  const path = usePath();
  const calendarId = /^\/admin\/([0-9a-f-]{36})$/.exec(path)?.[1];
  const previewId = /^\/admin\/([0-9a-f-]{36})\/preview$/.exec(path)?.[1];
  const loadCalendar = useCallback((id: string) => admin.calendar(id), [admin]);

  useEffect(() => {
    document.title = 'Kalender · admin';
    if (previewId === undefined) {
      delete document.documentElement.dataset.theme;
    }
  }, [previewId]);

  const onUnauthenticated = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        admin.logOut();
        setSignedIn(false);
        return true;
      }
      return false;
    },
    [admin],
  );

  if (!signedIn) {
    return (
      <LogIn
        onDone={() => {
          setSignedIn(true);
        }}
      />
    );
  }
  if (previewId !== undefined) {
    return (
      <CalendarPreviewScreen
        calendarId={previewId}
        load={loadCalendar}
        onError={onUnauthenticated}
        onBack={() => {
          navigate(`/admin/${previewId}`);
        }}
      />
    );
  }
  return (
    <main className="admin">
      <div className="admin__bar">
        <h1>
          <a
            className="admin__link"
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              navigate('/admin');
            }}
          >
            Kalendere
          </a>
        </h1>
        <button
          className="button button--ghost"
          onClick={() => {
            admin.logOut();
            setSignedIn(false);
          }}
        >
          Logg ut
        </button>
      </div>
      {calendarId === undefined ? (
        <CalendarList onUnauthenticated={onUnauthenticated} />
      ) : (
        <CalendarEditor calendarId={calendarId} onUnauthenticated={onUnauthenticated} />
      )}
    </main>
  );
}

function LogIn({ onDone }: { readonly onDone: () => void }) {
  const { admin } = useServices();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="admin">
      <form
        className="card form"
        onSubmit={(event) => {
          event.preventDefault();
          admin.logIn(password).then(onDone, (caught: unknown) => {
            setError(message(caught));
          });
        }}
      >
        <h1>Logg inn</h1>
        <label className="field">
          Passord
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </label>
        {error !== null && <p className="error">{error}</p>}
        <button className="kbutton kbutton--purple" type="submit">
          Logg inn
        </button>
      </form>
    </main>
  );
}

interface Guarded {
  readonly onUnauthenticated: (error: unknown) => boolean;
}

function SettingsForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  readonly initial: CalendarSettings;
  readonly submitLabel: string;
  readonly onSubmit: (settings: CalendarSettings) => Promise<void>;
}) {
  const [settings, setSettings] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<CalendarSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };
  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        onSubmit(settings).catch((caught: unknown) => {
          setError(message(caught));
        });
      }}
    >
      <div className="form__grid">
        <label className="field">
          Tittel
          <input
            value={settings.title}
            onChange={(e) => {
              set({ title: e.target.value });
            }}
            required
          />
        </label>
        <label className="field">
          Mottaker
          <input
            value={settings.recipientName}
            onChange={(e) => {
              set({ recipientName: e.target.value });
            }}
            required
          />
        </label>
        <label className="field">
          Adresse (/c/…)
          <input
            value={settings.slug}
            onChange={(e) => {
              set({ slug: e.target.value.toLowerCase() });
            }}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
          />
        </label>
        <label className="field">
          Tema
          <select
            value={settings.theme}
            onChange={(e) => {
              set({ theme: e.target.value as CalendarSettings['theme'] });
            }}
          >
            <option value="birthday">Bursdag</option>
            <option value="christmas">Jul</option>
          </select>
        </label>
        <label className="field">
          Språk
          <select
            value={settings.locale}
            onChange={(e) => {
              set({ locale: e.target.value as CalendarSettings['locale'] });
            }}
          >
            <option value="nb">Norsk</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="field">
          Standard tidspunkt for luker og varsler
          <input
            type="time"
            value={settings.defaultOpenTime}
            onChange={(e) => {
              set({ defaultOpenTime: e.target.value });
            }}
            required
          />
        </label>
        <label className="field">
          Tidssone
          <input
            value={settings.timeZone}
            onChange={(e) => {
              set({ timeZone: e.target.value });
            }}
            placeholder="Europe/Oslo"
            required
          />
        </label>
      </div>
      {error !== null && <p className="error">{error}</p>}
      <div>
        <button className="kbutton kbutton--green" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function CalendarList({ onUnauthenticated }: Guarded) {
  const { admin } = useServices();
  const [calendars, setCalendars] = useState<readonly CalendarDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    admin.listCalendars().then(setCalendars, (caught: unknown) => {
      if (!onUnauthenticated(caught)) {
        setError(message(caught));
      }
    });
  }, [admin, onUnauthenticated]);

  return (
    <>
      {error !== null && <p className="error">{error}</p>}
      {calendars?.map((calendar) => (
        <a
          key={calendar.id}
          className="card"
          href={`/admin/${calendar.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/admin/${calendar.id}`);
          }}
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          <h2>{calendar.title}</h2>
          <p className="admin__muted">
            Til {calendar.recipientName} · /c/{calendar.slug} ·{' '}
            {calendar.theme === 'christmas' ? 'Jul' : 'Bursdag'}
          </p>
        </a>
      ))}
      <section className="card">
        <h2>Ny kalender</h2>
        <SettingsForm
          initial={{
            slug: '',
            title: '',
            recipientName: '',
            theme: 'birthday',
            locale: 'nb',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            defaultOpenTime: '08:00',
          }}
          submitLabel="Opprett"
          onSubmit={async (settings) => {
            const calendar = await admin.createCalendar(settings);
            navigate(`/admin/${calendar.id}`);
          }}
        />
      </section>
    </>
  );
}

type Step = 'setup' | 'share' | 'new' | number;

const SHAPES = ['▲', '◆', '●', '■'] as const;
const COLORS = ['red', 'blue', 'yellow', 'green'] as const;

function parseStep(search: string): Step | null {
  const value = new URLSearchParams(search).get('steg');
  if (value === 'oppsett') {
    return 'setup';
  }
  if (value === 'del') {
    return 'share';
  }
  if (value === 'ny') {
    return 'new';
  }
  const number = Number(value);
  return value !== null && Number.isInteger(number) && number > 0 ? number : null;
}

function stepParam(step: Step): string {
  return step === 'setup'
    ? 'oppsett'
    : step === 'share'
      ? 'del'
      : step === 'new'
        ? 'ny'
        : String(step);
}

function CalendarEditor({
  calendarId,
  onUnauthenticated,
}: Guarded & { readonly calendarId: string }) {
  const { admin, images } = useServices();
  const [details, setDetails] = useState<CalendarDetailsResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ number: number; content: OpenDoorContentDto } | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [chosen, setChosen] = useState<Step | null>(() => parseStep(location.search));

  const load = useCallback(() => {
    admin.calendar(calendarId).then(setDetails, (caught: unknown) => {
      if (!onUnauthenticated(caught)) {
        setError(message(caught));
      }
    });
  }, [admin, calendarId, onUnauthenticated]);

  useEffect(load, [load]);
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  if (details === null) {
    return error === null ? (
      <p className="admin__muted">Laster …</p>
    ) : (
      <p className="error">{error}</p>
    );
  }
  const { calendar, doors } = details;
  const steps: Step[] = ['setup', ...doors.map((door) => door.number), 'new', 'share'];
  const fallback: Step = doors[0]?.number ?? 'setup';
  const step: Step = chosen !== null && steps.includes(chosen) ? chosen : fallback;
  const index = steps.indexOf(step);
  const go = (next: Step) => {
    history.replaceState(null, '', `/admin/${calendar.id}?steg=${stepParam(next)}`);
    setChosen(next);
    setNotice(null);
    scrollTo({ top: 0, behavior: 'smooth' });
  };
  const previous = steps[index - 1];
  const following = steps[index + 1];

  const link = `${location.origin}/c/${calendar.slug}?k=${encodeURIComponent(calendar.accessKey)}`;
  const last = doors.at(-1);
  const nextNumber = (last?.number ?? 0) + 1;
  const nextDraft: DoorDraftDto = {
    number: nextNumber,
    opensOn: new Date(
      last === undefined ? now + DAY : Date.parse(`${last.opensOn}T12:00:00Z`) + DAY,
    )
      .toISOString()
      .slice(0, 10),
    openTime: null,
    featured: false,
    content: {
      title: '',
      message: '',
      imageUrl: null,
      linkUrl: null,
      countdown: null,
      confetti: false,
    },
    notification: {
      title: `Luke ${String(nextNumber)} er åpen 🎁`,
      body: 'Noe nytt venter på deg.',
    },
  };
  const upload = async (file: File) => admin.uploadImage(await images.resize(file, 2000));
  const showPreview = (draft: DoorDraftDto) => {
    setPreview({
      number: draft.number,
      content: {
        ...draft.content,
        link:
          draft.content.linkUrl === null
            ? null
            : { url: draft.content.linkUrl, kind: 'web', embedUrl: null },
      },
    });
  };
  const door =
    typeof step === 'number' ? doors.find((candidate) => candidate.number === step) : undefined;

  return (
    <div className="wizard">
      <header className="wizard__top">
        <h2 className="wizard__name">{calendar.title}</h2>
        <button
          className="kbutton kbutton--purple"
          onClick={() => {
            navigate(`/admin/${calendar.id}/preview`);
          }}
        >
          👀 Se hele kalenderen
        </button>
      </header>

      <nav className="rail" aria-label="Steg">
        {steps.map((candidate, position) => {
          const color = COLORS[position % COLORS.length] ?? 'red';
          const active = candidate === step;
          const railDoor =
            typeof candidate === 'number'
              ? doors.find((item) => item.number === candidate)
              : undefined;
          const done = railDoor !== undefined && railDoor.content.title.trim() !== '';
          return (
            <button
              key={String(candidate)}
              className={`rail__tile rail__tile--${color}${active ? ' rail__tile--active' : ''}`}
              onClick={() => {
                go(candidate);
              }}
              aria-current={active ? 'step' : undefined}
            >
              {railDoor?.content.imageUrl != null && (
                <img className="rail__photo" src={railDoor.content.imageUrl} alt="" />
              )}
              <span className="rail__shape" aria-hidden="true">
                {SHAPES[position % SHAPES.length]}
              </span>
              <span className="rail__label">
                {candidate === 'setup'
                  ? '⚙️ Oppsett'
                  : candidate === 'share'
                    ? '🚀 Del'
                    : candidate === 'new'
                      ? '＋ Ny luke'
                      : String(candidate)}
              </span>
              {done && <span className="rail__done">✓</span>}
              {railDoor?.featured === true && <span className="rail__bow">🎀</span>}
            </button>
          );
        })}
      </nav>

      <section className="wizard__stage" key={String(step)}>
        {step === 'setup' && (
          <div className="door-form">
            <h2 className="door-form__title">⚙️ Oppsett</h2>
            <SettingsForm
              initial={calendar}
              submitLabel="💾 Lagre oppsett"
              onSubmit={async (settings) => {
                await admin.updateCalendar(calendar.id, settings);
                load();
                setNotice('Lagret ✓');
              }}
            />
            {notice !== null && <p className="door-form__saved">{notice}</p>}
          </div>
        )}

        {door !== undefined && (
          <DoorForm
            key={door.id}
            door={door}
            initial={door}
            defaultOpenTime={calendar.defaultOpenTime}
            onSave={async (draft) => {
              await admin.editDoor(door.id, draft);
              load();
            }}
            onRemove={async () => {
              if (confirm(`Slette luke ${String(door.number)}?`)) {
                await admin.removeDoor(door.id);
                load();
                go(previous ?? 'setup');
              }
            }}
            onUpload={upload}
            onPreview={showPreview}
            {...(following === undefined
              ? {}
              : {
                  onNext: () => {
                    go(following);
                  },
                })}
          />
        )}

        {step === 'new' && (
          <DoorForm
            key={`new-${String(nextNumber)}`}
            initial={nextDraft}
            defaultOpenTime={calendar.defaultOpenTime}
            onSave={async (draft) => {
              const added = await admin.addDoor(calendar.id, draft);
              load();
              go(added.number);
            }}
            onUpload={upload}
            onPreview={showPreview}
          />
        )}

        {step === 'share' && (
          <div className="door-form">
            <h2 className="door-form__title">🚀 Del med {calendar.recipientName}</h2>
            <fieldset className="door-form__section">
              <legend>🔗 Lenken hennes (hold den hemmelig)</legend>
              <a className="admin__link" href={link} target="_blank" rel="noreferrer">
                {link}
              </a>
              <div className="door-form__actions">
                <button
                  className="kbutton kbutton--green"
                  onClick={() => {
                    void navigator.clipboard.writeText(link).then(() => {
                      setNotice('Kopiert ✓');
                    });
                  }}
                >
                  📋 Kopier lenke
                </button>
                <button
                  className="kbutton kbutton--red"
                  onClick={() => {
                    if (
                      confirm('Ny lenke? Den gamle slutter å virke, også på Hjem-skjermen hennes.')
                    ) {
                      admin.rotateKey(calendar.id).then(load, (caught: unknown) => {
                        setNotice(message(caught));
                      });
                    }
                  }}
                >
                  🔄 Ny lenke
                </button>
              </div>
            </fieldset>
            <fieldset className="door-form__section">
              <legend>🔔 Varsler</legend>
              <p className="wizard__big">
                {details.subscriberCount === 0
                  ? 'Ingen har slått på varsler ennå.'
                  : `${String(details.subscriberCount)} enhet(er) får varsler 🎉`}
              </p>
              <p className="admin__muted">
                iPhone: åpne lenken i Safari → Del → «Legg til på Hjem-skjerm» → åpne fra
                Hjem-skjermen → «Slå på varsler».
              </p>
              <div className="door-form__actions">
                <button
                  className="kbutton kbutton--blue"
                  onClick={() => {
                    admin.sendTestNotification(calendar.id).then(
                      ({ sent, failed }) => {
                        setNotice(`Testvarsel: ${String(sent)} sendt, ${String(failed)} feilet`);
                      },
                      (caught: unknown) => {
                        setNotice(message(caught));
                      },
                    );
                  }}
                >
                  📣 Send testvarsel
                </button>
              </div>
            </fieldset>
            {notice !== null && <p className="door-form__saved">{notice}</p>}
          </div>
        )}
      </section>

      <footer className="wizard__nav">
        <button
          className="kbutton kbutton--ghost"
          disabled={previous === undefined}
          onClick={() => {
            if (previous !== undefined) {
              go(previous);
            }
          }}
        >
          ◀ Forrige
        </button>
        <span className="wizard__count">
          {index + 1} / {steps.length}
        </span>
        <button
          className="kbutton kbutton--blue"
          disabled={following === undefined}
          onClick={() => {
            if (following !== undefined) {
              go(following);
            }
          }}
        >
          Neste ▶
        </button>
      </footer>

      {preview !== null && (
        <DoorSheet
          number={preview.number}
          content={preview.content}
          now={now}
          copy={RECIPIENT_COPY[calendar.locale]}
          onClose={() => {
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}
