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
import { GiverDoorComments } from '../ui/door-comments';
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
        <button className="button button--ghost" type="submit">
          Logg inn
        </button>
      </form>
    </main>
  );
}

interface Guarded {
  readonly onUnauthenticated: (error: unknown) => boolean;
}

/** `Karoline Ø` → `karoline-o`: a link-safe address from a name. */
function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Keeps password managers off fields that are not logins. */
const NOT_A_LOGIN = {
  autoComplete: 'off',
  'data-1p-ignore': true,
  'data-lpignore': 'true',
} as const;

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
  // A new calendar's address follows the recipient's name until it is typed in.
  const [slugTyped, setSlugTyped] = useState(initial.slug !== '');
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
            {...NOT_A_LOGIN}
            value={settings.title}
            onChange={(e) => {
              set({ title: e.target.value });
            }}
            required
            placeholder="Karolines bursdag"
          />
        </label>
        <label className="field">
          Mottaker
          <input
            {...NOT_A_LOGIN}
            value={settings.recipientName}
            onChange={(e) => {
              const recipientName = e.target.value;
              set(slugTyped ? { recipientName } : { recipientName, slug: slugOf(recipientName) });
            }}
            required
            placeholder="Navnet som står øverst i kalenderen"
          />
        </label>
        <label className="field">
          Adresse (/c/…)
          <input
            {...NOT_A_LOGIN}
            value={settings.slug}
            onChange={(e) => {
              setSlugTyped(true);
              set({ slug: e.target.value.toLowerCase() });
            }}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="karoline"
            title="Små bokstaver, tall og bindestrek. Blir slutten av lenken hennes."
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
            {...NOT_A_LOGIN}
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
        <button className="button" type="submit">
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

/** A step of the wizard: the setup, one door (by id, since numbers follow the dates) or sharing. */
type Step = 'setup' | 'share' | { readonly door: string };

function parseStep(search: string): Step | null {
  const value = new URLSearchParams(search).get('steg');
  if (value === null || value === '') {
    return null;
  }
  return value === 'oppsett' ? 'setup' : value === 'del' ? 'share' : { door: value };
}

function stepParam(step: Step): string {
  return step === 'setup' ? 'oppsett' : step === 'share' ? 'del' : step.door;
}

function sameStep(a: Step, b: Step): boolean {
  return typeof a === 'string' || typeof b === 'string' ? a === b : a.door === b.door;
}

/** Types by extension, for files the browser gives no type (often .heic, .m4a or .mov). */
const TYPES_BY_EXTENSION: Readonly<Record<string, string>> = {
  heic: 'image/heic',
  heif: 'image/heic',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

function mediaTypeOf(file: File): string {
  if (file.type !== '') {
    return file.type;
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return TYPES_BY_EXTENSION[extension] ?? 'application/octet-stream';
}

const PUBLISHED_AT = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

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
  const [publishing, setPublishing] = useState(false);

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
  const steps: Step[] = ['setup', ...doors.map((door) => ({ door: door.id })), 'share'];
  const fallback: Step = doors[0] === undefined ? 'setup' : { door: doors[0].id };
  const step: Step =
    chosen !== null && steps.some((candidate) => sameStep(candidate, chosen)) ? chosen : fallback;
  const index = steps.findIndex((candidate) => sameStep(candidate, step));
  const go = (next: Step) => {
    history.replaceState(null, '', `/admin/${calendar.id}?steg=${stepParam(next)}`);
    setChosen(next);
    setNotice(null);
    scrollTo({ top: 0, behavior: 'smooth' });
  };
  const previous = steps[index - 1];
  const following = steps[index + 1];

  const link = `${location.origin}/c/${calendar.slug}?k=${encodeURIComponent(calendar.accessKey)}`;
  const followerLink = `${location.origin}/c/${calendar.slug}?k=${encodeURIComponent(calendar.followerKey)}`;
  const last = doors.at(-1);
  const nextDraft: DoorDraftDto = {
    opensOn: new Date(
      last === undefined ? now + DAY : Date.parse(`${last.opensOn}T12:00:00Z`) + DAY,
    )
      .toISOString()
      .slice(0, 10),
    openTime: null,
    featured: false,
    hidden: false,
    content: {
      title: 'Ny luke',
      message: '',
      imageUrl: null,
      secondImageUrl: null,
      videoUrl: null,
      audioUrl: null,
      linkUrl: null,
      countdown: null,
      confetti: false,
    },
    notification: {
      title: 'En ny luke er åpen 🎁',
      body: 'Noe nytt venter på deg.',
    },
  };
  const addDoor = () => {
    admin.addDoor(calendar.id, nextDraft).then(
      (added) => {
        load();
        go({ door: added.id });
      },
      (caught: unknown) => {
        setError(message(caught));
      },
    );
  };
  const publish = () => {
    setPublishing(true);
    admin
      .publish(calendar.id)
      .then(
        (version) => {
          setNotice(`Publisert som versjon ${String(version.version)} ✓`);
          load();
        },
        (caught: unknown) => {
          setError(message(caught));
        },
      )
      .finally(() => {
        setPublishing(false);
      });
  };
  const live = details.versions[0];
  const upload = async (file: File) => {
    const type = mediaTypeOf(file);
    // Photos are shrunk (and HEIC turned into JPEG); songs and videos go up as they are.
    return admin.uploadMedia(
      type.startsWith('image/') ? await images.resize(file, 2000) : file.slice(0, file.size, type),
    );
  };
  const showPreview = (number: number, draft: DoorDraftDto) => {
    setPreview({
      number,
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
    typeof step === 'string' ? undefined : doors.find((candidate) => candidate.id === step.door);

  return (
    <div className="wizard">
      <header className="wizard__top">
        <h2 className="wizard__name">{calendar.title}</h2>
        <button
          className="button button--ghost"
          onClick={() => {
            navigate(`/admin/${calendar.id}/preview`);
          }}
        >
          👀 Forhåndsvis kalenderen
        </button>
      </header>

      <div className={`publish${details.unpublishedChanges ? ' publish--pending' : ''}`}>
        <span className="publish__state">
          {live === undefined
            ? `Ikke publisert – ${calendar.recipientName} ser ingen luker ennå.`
            : `Versjon ${String(live.version)} · publisert ${PUBLISHED_AT.format(Date.parse(live.publishedAt))}`}
          {details.unpublishedChanges && live !== undefined && ' · upubliserte endringer'}
        </span>
        <button
          className="button"
          disabled={publishing || !details.unpublishedChanges}
          onClick={publish}
        >
          {publishing ? 'Publiserer …' : 'Publiser'}
        </button>
      </div>
      {error !== null && <p className="error">{error}</p>}

      <nav className="rail" aria-label="Steg">
        {steps.map((candidate) => {
          const active = sameStep(candidate, step);
          const railDoor =
            typeof candidate === 'string'
              ? undefined
              : doors.find((item) => item.id === candidate.door);
          // Ready: a hatch with a title and a photo; sharing once her phone gets notifications.
          const missing =
            railDoor === undefined
              ? null
              : railDoor.content.title.trim() === ''
                ? 'mangler tittel'
                : railDoor.content.imageUrl === null
                  ? 'mangler bilde'
                  : null;
          const done =
            (railDoor !== undefined && missing === null) ||
            (candidate === 'share' && details.subscriberCount > 0);
          return (
            <button
              key={stepParam(candidate)}
              className={`rail__tile${active ? ' rail__tile--active' : ''}${done ? ' rail__tile--done' : ''}${railDoor?.content.imageUrl != null ? ' rail__tile--photo' : ''}`}
              title={missing ?? undefined}
              onClick={() => {
                go(candidate);
              }}
              aria-current={active ? 'step' : undefined}
            >
              {railDoor?.content.imageUrl != null && (
                <img className="rail__photo" src={railDoor.content.imageUrl} alt="" />
              )}
              <span className="rail__label">
                {candidate === 'setup'
                  ? 'Oppsett'
                  : candidate === 'share'
                    ? 'Del'
                    : `Luke ${String(railDoor?.number ?? '')}`}
              </span>
              {done && <span className="rail__done">✓</span>}
              {(railDoor?.featured === true || railDoor?.hidden === true) && (
                <span
                  className="rail__bow"
                  aria-label={railDoor.hidden ? 'Hemmelig luke' : 'Spesiell luke'}
                >
                  {railDoor.hidden ? '🤫' : '🎀'}
                </span>
              )}
            </button>
          );
        })}
        <button className="rail__tile rail__tile--add" onClick={addDoor}>
          <span className="rail__label">＋ Ny luke</span>
        </button>
      </nav>

      <section className="wizard__stage" key={stepParam(step)}>
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
          <>
            <DoorForm
              key={door.id}
              door={door}
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
              onPreview={(draft) => {
                showPreview(door.number, draft);
              }}
              {...(following === undefined
                ? {}
                : {
                    onNext: () => {
                      go(following);
                    },
                  })}
            />
            <section className="door-form">
              <GiverDoorComments doorId={door.id} opened={Date.parse(door.opensAt) <= now} />
            </section>
          </>
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
                  className="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(link).then(() => {
                      setNotice('Kopiert ✓');
                    });
                  }}
                >
                  📋 Kopier lenke
                </button>
                <button
                  className="button button--danger"
                  onClick={() => {
                    if (
                      confirm('Ny lenke? Den gamle slutter å virke, også på Hjem-skjermen hennes.')
                    ) {
                      admin.rotateKey(calendar.id, 'recipient').then(load, (caught: unknown) => {
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
              <legend>👀 Følgerlenke (for deg og andre som vil følge med)</legend>
              <p className="admin__muted">
                Viser det {calendar.recipientName} ser, med de samme varslene. Åpner du en luke her,
                teller det ikke for henne.
              </p>
              <a className="admin__link" href={followerLink} target="_blank" rel="noreferrer">
                {followerLink}
              </a>
              <div className="door-form__actions">
                <button
                  className="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(followerLink).then(() => {
                      setNotice('Følgerlenke kopiert ✓');
                    });
                  }}
                >
                  📋 Kopier følgerlenke
                </button>
                <button
                  className="button button--danger"
                  onClick={() => {
                    if (
                      confirm(
                        'Ny følgerlenke? Den gamle slutter å virke. Hennes lenke virker fortsatt.',
                      )
                    ) {
                      admin.rotateKey(calendar.id, 'follower').then(load, (caught: unknown) => {
                        setNotice(message(caught));
                      });
                    }
                  }}
                >
                  🔄 Ny følgerlenke
                </button>
              </div>
            </fieldset>
            <fieldset className="door-form__section">
              <legend>🗂 Versjoner</legend>
              {details.versions.length === 0 ? (
                <p className="admin__muted">Ingenting publisert ennå.</p>
              ) : (
                <ul className="versions">
                  {details.versions.map((version) => (
                    <li key={version.version}>
                      Versjon {version.version} ·{' '}
                      {PUBLISHED_AT.format(Date.parse(version.publishedAt))} · {version.doorCount}{' '}
                      luker
                    </li>
                  ))}
                </ul>
              )}
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
                  className="button"
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
        {details.unpublishedChanges && (
          <div className="unpublished" role="status">
            <span>
              ✏️ Upubliserte endringer – {calendar.recipientName} ser dem ikke før du publiserer.
            </span>
            <button className="button" disabled={publishing} onClick={publish}>
              {publishing ? 'Publiserer …' : 'Publiser'}
            </button>
          </div>
        )}
        <button
          className="button button--ghost"
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
          className="button"
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
