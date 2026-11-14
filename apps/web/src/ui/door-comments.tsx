import { useCallback, useEffect, useState } from 'react';
import type {
  AddDoorCommentRequestDto,
  CalendarAccess,
  CalendarRole,
  DoorCommentDto,
} from '@b-calendar/contracts';
import { useServices } from '../app/services';

/** The words of the comment section, in her language on her calendar, Norwegian in the admin. */
export interface CommentsCopy {
  readonly comments: string;
  readonly noComments: string;
  readonly writeComment: string;
  readonly yourName: string;
  readonly send: string;
  readonly commentFailed: string;
}

interface DoorCommentsProps {
  readonly copy: CommentsCopy;
  readonly load: () => Promise<readonly DoorCommentDto[]>;
  readonly add: (comment: AddDoorCommentRequestDto) => Promise<DoorCommentDto>;
  /**
   * Where the writer's name is remembered on this device; null when the writer needs no name (her
   * own link writes with her name).
   */
  readonly nameKey: string | null;
  /** The admin can remove comments. */
  readonly onRemove?: (comment: DoorCommentDto) => Promise<void>;
  /** Shown above the field, e.g. for the giver on a door that has not opened. */
  readonly hint?: string;
}

/**
 * A door's comments and a field to add one. The same section on her calendar, a follower's and in
 * the admin; what differs comes in through the props.
 */
export function DoorComments({ copy, load, add, nameKey, onRemove, hint }: DoorCommentsProps) {
  const { names, push } = useServices();
  const [comments, setComments] = useState<readonly DoorCommentDto[] | null>(null);
  const [text, setText] = useState('');
  const [name, setName] = useState(() => (nameKey === null ? '' : (names.find(nameKey) ?? '')));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const format = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    load().then(setComments, () => {
      setComments([]);
    });
  }, [load]);

  const needsName = nameKey !== null;
  const ready = text.trim() !== '' && (!needsName || name.trim() !== '');
  const send = async () => {
    setSending(true);
    setError(null);
    try {
      // This phone's own push address, so it is not told about its own comment.
      const endpoint = await push.endpoint();
      const added = await add({
        text,
        ...(needsName ? { author: name.trim() } : {}),
        ...(endpoint === null ? {} : { endpoint }),
      });
      setComments((current) => [...(current ?? []), added]);
      setText('');
      if (nameKey !== null) {
        names.save(nameKey, name.trim());
      }
    } catch {
      setError(copy.commentFailed);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="comments" aria-label={copy.comments}>
      <h3 className="comments__title">💬 {copy.comments}</h3>
      {comments !== null && comments.length === 0 && (
        <p className="comments__empty">{copy.noComments}</p>
      )}
      <ul className="comments__list">
        {comments?.map((comment) => (
          <li key={comment.id} className={`comments__item comments__item--${comment.role}`}>
            <span className="comments__meta">
              {comment.author}
              {comment.role === 'giver' ? ' 🎁' : ''} ·{' '}
              {format.format(Date.parse(comment.createdAt))}
            </span>
            <span className="comments__text">{comment.text}</span>
            {onRemove !== undefined && (
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => {
                  if (confirm('Slette kommentaren?')) {
                    onRemove(comment).then(
                      () => {
                        setComments((current) =>
                          (current ?? []).filter((item) => item.id !== comment.id),
                        );
                      },
                      () => undefined,
                    );
                  }
                }}
              >
                Slett
              </button>
            )}
          </li>
        ))}
      </ul>
      {hint !== undefined && <p className="comments__empty">{hint}</p>}
      <form
        className="comments__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) {
            void send();
          }
        }}
      >
        {needsName && (
          <input
            className="comments__name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder={copy.yourName}
            maxLength={40}
            autoComplete="given-name"
          />
        )}
        <div className="comments__row">
          <textarea
            className="comments__input"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
            }}
            placeholder={copy.writeComment}
            maxLength={1000}
            rows={2}
          />
          <button className="button comments__send" type="submit" disabled={sending || !ready}>
            {copy.send}
          </button>
        </div>
        {error !== null && <p className="error">{error}</p>}
      </form>
    </section>
  );
}

/** The comment section on her calendar or a follower's: by door number, with the link's key. */
export function RecipientDoorComments({
  access,
  number,
  role,
  copy,
}: {
  readonly access: CalendarAccess;
  readonly number: number;
  readonly role: CalendarRole;
  readonly copy: CommentsCopy;
}) {
  const { calendars } = useServices();
  const load = useCallback(() => calendars.comments(access, number), [calendars, access, number]);
  const add = useCallback(
    (comment: AddDoorCommentRequestDto) => calendars.comment(access, number, comment),
    [calendars, access, number],
  );
  return (
    <DoorComments
      copy={copy}
      load={load}
      add={add}
      nameKey={role === 'follower' ? access.slug : null}
    />
  );
}

const GIVER_COPY: CommentsCopy = {
  comments: 'Kommentarer',
  noComments: 'Ingen kommentarer ennå.',
  writeComment: 'Skriv en kommentar som giver …',
  yourName: 'Navnet ditt (vises med 🎁)',
  send: 'Send',
  commentFailed: 'Kommentaren ble ikke sendt. Er luken publisert?',
};

/**
 * The comment section in the admin: the giver writes behind any published door, also one that
 * has not opened (it waits there for her), reads and removes.
 */
export function GiverDoorComments({
  doorId,
  opened,
}: {
  readonly doorId: string;
  /** Whether the door has opened; before that, comments wait quietly. */
  readonly opened: boolean;
}) {
  const { admin } = useServices();
  const load = useCallback(() => admin.doorComments(doorId), [admin, doorId]);
  const add = useCallback(
    (comment: AddDoorCommentRequestDto) => admin.addComment(doorId, comment),
    [admin, doorId],
  );
  const remove = useCallback((comment: DoorCommentDto) => admin.removeComment(comment.id), [admin]);
  return (
    <DoorComments
      copy={GIVER_COPY}
      load={load}
      add={add}
      nameKey="giver"
      onRemove={remove}
      {...(opened
        ? {}
        : {
            hint: 'Luken har ikke åpnet: kommentaren venter på henne, uten varsel. Luken må være publisert.',
          })}
    />
  );
}
