import { useEffect, useRef, useState } from 'react';
import { MAX_MEDIA_BYTES } from '@b-calendar/contracts';
import type { DoorPreviewDto, UploadMediaResponseDto } from '@b-calendar/contracts';
import { ApiError } from '../shared/shared.model';
import type { DoorDraftDto } from '../admin/admin.ports';

/** `2026-11-15T08:00` in the browser's time zone, for datetime-local inputs. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

/** The form's upload boxes: two photos and one for a video or song. */
type UploadBox = 'image' | 'image2' | 'clip';

const MB = 1024 * 1024;

function megabytes(bytes: number): string {
  return `${String(Math.max(1, Math.round(bytes / MB)))} MB`;
}

/** Why an upload failed, in words she can act on. */
function uploadProblem(caught: unknown): string {
  if (caught instanceof ApiError) {
    if (caught.status === 413) {
      return 'Filen er for stor til å lastes opp (over 100 MB). Klipp den kortere eller film i 1080p.';
    }
    if (caught.status === 0) {
      return 'Ingen forbindelse. Prøv igjen.';
    }
    if (caught.code === 'validation_failed') {
      return `Ikke godtatt: ${caught.message}`;
    }
    if (caught.status === 401) {
      return 'Du er logget ut. Logg inn igjen.';
    }
  }
  return 'Opplastingen feilet. Prøv igjen.';
}

/** How long typing must pause before the draft saves itself. */
const AUTOSAVE_MS = 700;

interface DoorFormProps {
  readonly door: DoorPreviewDto;
  /** The calendar's default time of day, `HH:MM`. */
  readonly defaultOpenTime: string;
  /** Saves the draft door; called by itself while she types. */
  readonly onSave: (draft: DoorDraftDto) => Promise<void>;
  readonly onRemove: () => Promise<void>;
  readonly onUpload: (file: File) => Promise<UploadMediaResponseDto>;
  readonly onPreview: (draft: DoorDraftDto) => void;
  /** Shown as "Neste": saves what is pending, then goes to the next step. */
  readonly onNext?: () => void;
}

/** One door's fields. Saves itself as she types; empty optional fields become null. */
export function DoorForm({
  door,
  defaultOpenTime,
  onSave,
  onRemove,
  onUpload,
  onPreview,
  onNext,
}: DoorFormProps) {
  const initial = door;
  const [opensOn, setOpensOn] = useState(initial.opensOn);
  const [ownTime, setOwnTime] = useState(initial.openTime !== null);
  const [openTime, setOpenTime] = useState(initial.openTime ?? defaultOpenTime);
  const [featured, setFeatured] = useState(initial.featured);
  const [hidden, setHidden] = useState(initial.hidden);
  const [title, setTitle] = useState(initial.content.title);
  const [message, setMessage] = useState(initial.content.message);
  const [imageUrl, setImageUrl] = useState(initial.content.imageUrl ?? '');
  const [secondImageUrl, setSecondImageUrl] = useState(initial.content.secondImageUrl ?? '');
  const [videoUrl, setVideoUrl] = useState(initial.content.videoUrl ?? '');
  const [audioUrl, setAudioUrl] = useState(initial.content.audioUrl ?? '');
  const [uploading, setUploading] = useState<UploadBox | null>(null);
  const [uploadingName, setUploadingName] = useState('');
  const [uploadError, setUploadError] = useState<{
    readonly box: UploadBox;
    readonly message: string;
  } | null>(null);
  // No field for it any more; a link a door already has is kept.
  const linkUrl = initial.content.linkUrl ?? '';
  const [countdownTo, setCountdownTo] = useState(
    initial.content.countdown === null ? '' : toLocalInput(initial.content.countdown.to),
  );
  const [countdownLabel, setCountdownLabel] = useState(initial.content.countdown?.label ?? '');
  const [confetti, setConfetti] = useState(initial.content.confetti);
  const [notificationTitle, setNotificationTitle] = useState(initial.notification.title);
  const [notificationBody, setNotificationBody] = useState(initial.notification.body);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = (): DoorDraftDto => ({
    opensOn,
    openTime: ownTime ? openTime : null,
    featured,
    hidden,
    content: {
      title: title.trim(),
      message,
      imageUrl: imageUrl.trim() === '' ? null : imageUrl.trim(),
      secondImageUrl: secondImageUrl === '' ? null : secondImageUrl,
      videoUrl: videoUrl === '' ? null : videoUrl,
      audioUrl: audioUrl === '' ? null : audioUrl,
      linkUrl: linkUrl.trim() === '' ? null : linkUrl.trim(),
      countdown:
        countdownTo === ''
          ? null
          : { to: fromLocalInput(countdownTo), label: countdownLabel.trim() },
      confetti,
    },
    notification: { title: notificationTitle.trim(), body: notificationBody.trim() },
  });

  // Dragging a file: which box it hovers, to light it up.
  const [dragOver, setDragOver] = useState<UploadBox | null>(null);
  useEffect(() => {
    // A file dropped beside a box must not open in the tab and leave the form.
    const keep = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files') === true) {
        event.preventDefault();
      }
    };
    window.addEventListener('dragover', keep);
    window.addEventListener('drop', keep);
    return () => {
      window.removeEventListener('dragover', keep);
      window.removeEventListener('drop', keep);
    };
  }, []);
  /** Drag and drop on an upload box: the file goes where its type belongs. */
  const dropTarget = (box: UploadBox) => ({
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(box);
    },
    onDragLeave: () => {
      setDragOver(null);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(null);
      const file = event.dataTransfer.files[0];
      if (file !== undefined && uploading === null) {
        const photo = file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name);
        // A photo dropped on the video box takes the first free photo box.
        const photoBox = box !== 'clip' ? box : imageUrl === '' ? 'image' : 'image2';
        uploadInto(photo ? photoBox : 'clip', file);
      }
    },
  });

  /** Puts an upload where its kind goes: a photo, a video or a song. */
  const uploadInto = (box: UploadBox, file: File) => {
    setUploadError(null);
    if (box === 'clip') {
      const video = file.type.startsWith('video/') || /\.(mov|mp4)$/i.test(file.name);
      const max = video ? MAX_MEDIA_BYTES.video : MAX_MEDIA_BYTES.audio;
      if (file.size > max) {
        setUploadError({
          box,
          message: `${video ? 'Videoen' : 'Sangen'} er ${megabytes(file.size)}, maks ${megabytes(max)}.${video ? ' Klipp den kortere i Bilder, eller film i 1080p.' : ''}`,
        });
        return;
      }
    }
    setUploading(box);
    setUploadingName(`${file.name} (${megabytes(file.size)})`);
    onUpload(file).then(
      ({ url, kind }) => {
        if (kind === 'image') {
          (box === 'image2' || (box === 'clip' && imageUrl !== '')
            ? setSecondImageUrl
            : setImageUrl)(url);
        } else if (kind === 'video') {
          setVideoUrl(url);
        } else {
          setAudioUrl(url);
        }
        setUploading(null);
      },
      (caught: unknown) => {
        setUploadError({ box, message: uploadProblem(caught) });
        setUploading(null);
      },
    );
  };

  /** One photo upload box: pick or drop, preview, remove. */
  const photoBox = (
    box: 'image' | 'image2',
    label: string,
    url: string,
    setUrl: (url: string) => void,
  ) => (
    <div className="field">
      {label}
      <label className={`upload${dragOver === box ? ' upload--over' : ''}`} {...dropTarget(box)}>
        {uploading === box ? (
          <span className="upload__empty">Laster opp {uploadingName} …</span>
        ) : url === '' ? (
          <span className="upload__empty">＋ Velg eller dra inn bilde</span>
        ) : (
          <img className="upload__preview" src={url} alt="" />
        )}
        <input
          type="file"
          accept="image/*,.heic,.heif"
          disabled={uploading !== null}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file !== undefined) {
              uploadInto(box, file);
            }
          }}
        />
      </label>
      {uploadError?.box === box && <p className="error">{uploadError.message}</p>}
      {url !== '' && (
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => {
            setUrl('');
          }}
        >
          Fjern bilde
        </button>
      )}
    </div>
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Noe gikk galt.');
    } finally {
      setBusy(false);
    }
  };

  // Autosave: what the form holds, against what was last saved.
  const serialized = JSON.stringify(draft());
  const [savedAs, setSavedAs] = useState(serialized);
  // A save that failed is not retried until the form changes again.
  const [failedAs, setFailedAs] = useState<string | null>(null);
  const problem =
    title.trim() === ''
      ? 'Skriv en tittel, så lagres luken.'
      : notificationTitle.trim() === ''
        ? 'Varselet trenger en tittel.'
        : opensOn === ''
          ? 'Velg en dag.'
          : null;
  const dirty = serialized !== savedAs;
  const save = useRef(onSave);
  useEffect(() => {
    save.current = onSave;
  });
  const flush = async () => {
    if (dirty && problem === null) {
      setSaving(true);
      try {
        await save.current(JSON.parse(serialized) as DoorDraftDto);
        setSavedAs(serialized);
        setFailedAs(null);
      } finally {
        setSaving(false);
      }
    }
  };
  useEffect(() => {
    if (!dirty || problem !== null || saving || serialized === failedAs) {
      return;
    }
    const timer = setTimeout(() => {
      setSaving(true);
      setError(null);
      save.current(JSON.parse(serialized) as DoorDraftDto).then(
        () => {
          setSavedAs(serialized);
          setFailedAs(null);
          setSaving(false);
        },
        (caught: unknown) => {
          setError(caught instanceof Error ? caught.message : 'Kunne ikke lagre.');
          setFailedAs(serialized);
          setSaving(false);
        },
      );
    }, AUTOSAVE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [serialized, dirty, problem, saving, failedAs]);
  const status =
    problem ??
    (saving
      ? 'Lagrer …'
      : failedAs === serialized
        ? 'Ikke lagret – se feilen nederst'
        : dirty
          ? 'Ikke lagret ennå'
          : 'Lagret ✓');

  const opens = new Date(door.opensAt).toLocaleString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <form
      className="door-form"
      onSubmit={(event) => {
        event.preventDefault();
        void run(flush);
      }}
    >
      <header className="door-form__head">
        <h2 className="door-form__title">
          {`Luke ${String(door.number)}`}
          {featured && ' 🎀'}
          {hidden && ' 🤫'}
          <span
            className={`door-form__status${problem === null && !dirty ? ' door-form__status--saved' : ''}`}
            aria-live="polite"
          >
            {status}
          </span>
        </h2>
        <div className="door-form__badges">
          <span className="chip">🗓 {opens}</span>
          <span className={`chip${door.notifiedAt === null ? '' : ' chip--good'}`}>
            {door.notifiedAt === null ? '🔕 Ikke varslet' : '🔔 Varslet'}
          </span>
          <span className={`chip${door.firstOpenedAt === null ? '' : ' chip--good'}`}>
            {door.firstOpenedAt === null
              ? '🙈 Ikke åpnet'
              : `👀 Åpnet ${new Date(door.firstOpenedAt).toLocaleString('nb-NO')}`}
          </span>
        </div>
      </header>

      <fieldset className="door-form__section">
        <legend>📅 Når</legend>
        <div className="form__grid">
          <label className="field">
            Dag (bestemmer lukenummeret)
            <input
              type="date"
              value={opensOn}
              onChange={(e) => {
                setOpensOn(e.target.value);
              }}
              required
            />
          </label>
          <div className="field">
            Tidspunkt (luken åpner og varselet sendes)
            <label className="field--check">
              <input
                type="checkbox"
                checked={ownTime}
                onChange={(e) => {
                  setOwnTime(e.target.checked);
                }}
              />
              {ownTime ? 'Eget tidspunkt' : `Standard (${defaultOpenTime})`}
            </label>
            {ownTime && (
              <input
                type="time"
                value={openTime}
                onChange={(e) => {
                  setOpenTime(e.target.value);
                }}
                required
              />
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="door-form__section">
        <legend>✍️ Innhold</legend>
        <label className="field">
          Tittel
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            required
            maxLength={120}
            placeholder="Ta med badetøy 👙"
          />
        </label>
        <label className="field">
          Melding
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            maxLength={5000}
            placeholder="Skriv noe fint …"
          />
        </label>
      </fieldset>

      <fieldset className="door-form__section">
        <legend>📸 Bilde, video og sang</legend>
        <p className="admin__muted">
          Alt er valgfritt: ett eller to bilder, en video og en sang, i hvilken som helst blanding.
        </p>
        <div className="form__grid">
          {photoBox('image', 'Bilde 1 (vises i ramme)', imageUrl, setImageUrl)}
          {photoBox(
            'image2',
            'Bilde 2 (valgfritt, ved siden av)',
            secondImageUrl,
            setSecondImageUrl,
          )}
          <div className="field">
            Video eller sang
            <label
              className={`upload${dragOver === 'clip' ? ' upload--over' : ''}`}
              {...dropTarget('clip')}
            >
              <span className="upload__empty">
                {uploading === 'clip'
                  ? 'Laster opp … (kan ta litt tid)'
                  : '＋ Velg eller dra inn video eller sang'}
              </span>
              <input
                type="file"
                accept="video/*,audio/*,.mov,.mp4,.m4a,.mp3,.aac"
                disabled={uploading !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file !== undefined) {
                    uploadInto('clip', file);
                  }
                }}
              />
            </label>
            {uploadError?.box === 'clip' && <p className="error">{uploadError.message}</p>}
            <small className="admin__muted">
              Video: MP4/MOV opptil 95 MB · sang: MP3/M4A opptil 25 MB
            </small>
          </div>
        </div>
        {videoUrl !== '' && (
          <div className="field">
            <video className="door-content__video" src={videoUrl} controls playsInline />
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                setVideoUrl('');
              }}
            >
              Fjern video
            </button>
          </div>
        )}
        {audioUrl !== '' && (
          <div className="field">
            <audio className="door-content__audio" src={audioUrl} controls />
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                setAudioUrl('');
              }}
            >
              Fjern sang
            </button>
          </div>
        )}
      </fieldset>

      <fieldset className="door-form__section">
        <legend>⏳ Nedtelling (valgfritt)</legend>
        <div className="form__grid">
          <label className="field">
            Teller ned til
            <input
              type="datetime-local"
              value={countdownTo}
              onChange={(e) => {
                setCountdownTo(e.target.value);
              }}
            />
          </label>
          <label className="field">
            Tekst under
            <input
              value={countdownLabel}
              onChange={(e) => {
                setCountdownLabel(e.target.value);
              }}
              placeholder="til vi drar! 🚗"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="door-form__section">
        <legend>✨ Ekstra</legend>
        <label className="toggle">
          <input
            type="checkbox"
            checked={confetti}
            onChange={(e) => {
              setConfetti(e.target.checked);
            }}
          />
          <span>🎉 Konfetti når luken åpnes</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => {
              setFeatured(e.target.checked);
            }}
          />
          <span>🎀 Spesiell luke – stor og innpakket som en gave</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => {
              setHidden(e.target.checked);
            }}
          />
          <span>🤫 Hemmelig luke – hun ser den ikke før den åpner</span>
        </label>
      </fieldset>

      <fieldset className="door-form__section">
        <legend>🔔 Varsel</legend>
        <div className="form__grid">
          <label className="field">
            Tittel
            <input
              value={notificationTitle}
              onChange={(e) => {
                setNotificationTitle(e.target.value);
              }}
              required
              maxLength={80}
            />
          </label>
          <label className="field">
            Tekst
            <input
              value={notificationBody}
              onChange={(e) => {
                setNotificationBody(e.target.value);
              }}
              maxLength={200}
            />
          </label>
        </div>
      </fieldset>

      {error !== null && <p className="error">{error}</p>}
      <div className="door-form__actions">
        {onNext !== undefined && (
          <button
            className="button"
            type="button"
            disabled={busy || problem !== null}
            onClick={() => {
              void run(async () => {
                await flush();
                onNext();
              });
            }}
          >
            Neste ▶
          </button>
        )}
        <button
          className="button button--ghost"
          type="button"
          onClick={() => {
            onPreview(draft());
          }}
        >
          Forhåndsvis
        </button>
        <button
          className="button button--danger"
          type="button"
          disabled={busy}
          onClick={() => {
            void run(onRemove);
          }}
        >
          Slett
        </button>
      </div>
    </form>
  );
}
