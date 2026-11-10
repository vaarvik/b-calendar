import { useState } from 'react';
import type { DoorPreviewDto } from '@b-calendar/contracts';
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

interface DoorFormProps {
  readonly initial: DoorDraftDto;
  readonly door?: DoorPreviewDto;
  /** The calendar's default time of day, `HH:MM`. */
  readonly defaultOpenTime: string;
  readonly onSave: (draft: DoorDraftDto) => Promise<void>;
  readonly onRemove?: () => Promise<void>;
  readonly onUpload: (file: File) => Promise<string>;
  readonly onPreview: (draft: DoorDraftDto) => void;
}

/** One door's fields. Empty optional fields become null. */
export function DoorForm({
  initial,
  door,
  defaultOpenTime,
  onSave,
  onRemove,
  onUpload,
  onPreview,
}: DoorFormProps) {
  const [number, setNumber] = useState(String(initial.number));
  const [opensOn, setOpensOn] = useState(initial.opensOn);
  const [ownTime, setOwnTime] = useState(initial.openTime !== null);
  const [openTime, setOpenTime] = useState(initial.openTime ?? defaultOpenTime);
  const [featured, setFeatured] = useState(initial.featured);
  const [title, setTitle] = useState(initial.content.title);
  const [message, setMessage] = useState(initial.content.message);
  const [imageUrl, setImageUrl] = useState(initial.content.imageUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(initial.content.linkUrl ?? '');
  const [countdownTo, setCountdownTo] = useState(
    initial.content.countdown === null ? '' : toLocalInput(initial.content.countdown.to),
  );
  const [countdownLabel, setCountdownLabel] = useState(initial.content.countdown?.label ?? '');
  const [confetti, setConfetti] = useState(initial.content.confetti);
  const [notificationTitle, setNotificationTitle] = useState(initial.notification.title);
  const [notificationBody, setNotificationBody] = useState(initial.notification.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const draft = (): DoorDraftDto => ({
    number: Number(number),
    opensOn,
    openTime: ownTime ? openTime : null,
    featured,
    content: {
      title: title.trim(),
      message,
      imageUrl: imageUrl.trim() === '' ? null : imageUrl.trim(),
      linkUrl: linkUrl.trim() === '' ? null : linkUrl.trim(),
      countdown:
        countdownTo === ''
          ? null
          : { to: fromLocalInput(countdownTo), label: countdownLabel.trim() },
      confetti,
    },
    notification: { title: notificationTitle.trim(), body: notificationBody.trim() },
  });

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await action();
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Noe gikk galt.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="card form admin-door"
      onSubmit={(event) => {
        event.preventDefault();
        void run(() => onSave(draft()));
      }}
    >
      <div className="admin-door__head">
        <h3>Luke {number}</h3>
        {door !== undefined && (
          <span className="admin__row">
            <span className="badge">
              Åpner{' '}
              {new Date(door.opensAt).toLocaleString('nb-NO', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className={`badge${door.notifiedAt === null ? '' : ' badge--good'}`}>
              {door.notifiedAt === null ? 'Ikke varslet' : 'Varslet'}
            </span>
            <span className={`badge${door.firstOpenedAt === null ? '' : ' badge--good'}`}>
              {door.firstOpenedAt === null
                ? 'Ikke åpnet'
                : `Åpnet ${new Date(door.firstOpenedAt).toLocaleString('nb-NO')}`}
            </span>
          </span>
        )}
      </div>
      <div className="form__grid">
        <label className="field">
          Nummer
          <input
            type="number"
            min={1}
            value={number}
            onChange={(e) => {
              setNumber(e.target.value);
            }}
            required
          />
        </label>
        <label className="field">
          Dag
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
      <label className="field">
        Tittel
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          required
          maxLength={120}
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
        />
      </label>
      <div className="form__grid">
        <label className="field">
          Bilde (last opp eller lim inn URL)
          <input
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
            }}
            placeholder="/media/… eller https://…"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file !== undefined) {
                void run(async () => {
                  setImageUrl(await onUpload(file));
                });
              }
            }}
          />
          {imageUrl !== '' && <img className="admin-preview" src={imageUrl} alt="" />}
        </label>
        <label className="field">
          Lenke (Spotify, YouTube eller annet)
          <input
            value={linkUrl}
            onChange={(e) => {
              setLinkUrl(e.target.value);
            }}
            placeholder="https://open.spotify.com/track/…"
          />
        </label>
      </div>
      <div className="form__grid">
        <label className="field">
          Nedtelling til (valgfritt)
          <input
            type="datetime-local"
            value={countdownTo}
            onChange={(e) => {
              setCountdownTo(e.target.value);
            }}
          />
        </label>
        <label className="field">
          Tekst under nedtellingen
          <input
            value={countdownLabel}
            onChange={(e) => {
              setCountdownLabel(e.target.value);
            }}
            placeholder="til vi drar!"
          />
        </label>
      </div>
      <label className="field field--check">
        <input
          type="checkbox"
          checked={confetti}
          onChange={(e) => {
            setConfetti(e.target.checked);
          }}
        />
        Konfetti når luken åpnes 🎉
      </label>
      <label className="field field--check">
        <input
          type="checkbox"
          checked={featured}
          onChange={(e) => {
            setFeatured(e.target.checked);
          }}
        />
        Spesiell luke 🎀 (stor og innpakket som en gave, synlig før den åpner)
      </label>
      <div className="form__grid">
        <label className="field">
          Varsel: tittel
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
          Varsel: tekst
          <input
            value={notificationBody}
            onChange={(e) => {
              setNotificationBody(e.target.value);
            }}
            maxLength={200}
          />
        </label>
      </div>
      {error !== null && <p className="error">{error}</p>}
      <div className="admin__row">
        <button className="button" type="submit" disabled={busy}>
          {door === undefined ? 'Legg til luke' : 'Lagre'}
        </button>
        <button
          className="button button--ghost"
          type="button"
          onClick={() => {
            onPreview(draft());
          }}
        >
          Forhåndsvis
        </button>
        {onRemove !== undefined && (
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
        )}
        {saved && <span className="admin__muted">Lagret ✓</span>}
      </div>
    </form>
  );
}
