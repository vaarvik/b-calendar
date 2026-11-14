import { useEffect, useState } from 'react';
import type { CalendarAccess, CalendarRole, DoorCommentDto } from '@b-calendar/contracts';
import { useServices } from '../app/services';
import type { RecipientCopy } from '../shared/shared.model';

interface DoorCommentsProps {
  readonly access: CalendarAccess;
  readonly number: number;
  readonly role: CalendarRole;
  readonly copy: RecipientCopy;
}

/** The comments behind an opened door, and a field to add one. */
export function DoorComments({ access, number, role, copy }: DoorCommentsProps) {
  const { calendars, names } = useServices();
  const [comments, setComments] = useState<readonly DoorCommentDto[] | null>(null);
  const [text, setText] = useState('');
  const [name, setName] = useState(() => names.find(access.slug) ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const format = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  useEffect(() => {
    calendars.comments(access, number).then(setComments, () => {
      setComments([]);
    });
  }, [calendars, access, number]);

  const needsName = role === 'follower';
  const send = () => {
    if (text.trim() === '' || (needsName && name.trim() === '')) {
      return;
    }
    setSending(true);
    setError(null);
    calendars
      .comment(access, number, needsName ? { author: name.trim(), text } : { text })
      .then(
        (added) => {
          setComments((current) => [...(current ?? []), added]);
          setText('');
          if (needsName) {
            names.save(access.slug, name.trim());
          }
        },
        () => {
          setError(copy.commentFailed);
        },
      )
      .finally(() => {
        setSending(false);
      });
  };

  return (
    <section className="comments" aria-label={copy.comments}>
      <h3 className="comments__title">💬 {copy.comments}</h3>
      {comments !== null && comments.length === 0 && (
        <p className="comments__empty">{copy.noComments}</p>
      )}
      <ul className="comments__list">
        {comments?.map((comment) => (
          <li
            key={comment.id}
            className={`comments__item${comment.role === 'recipient' ? ' comments__item--hers' : ''}`}
          >
            <span className="comments__meta">
              {comment.author} · {format.format(Date.parse(comment.createdAt))}
            </span>
            <span className="comments__text">{comment.text}</span>
          </li>
        ))}
      </ul>
      <form
        className="comments__form"
        onSubmit={(event) => {
          event.preventDefault();
          send();
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
          <button
            className="button comments__send"
            type="submit"
            disabled={sending || text.trim() === '' || (needsName && name.trim() === '')}
          >
            {copy.send}
          </button>
        </div>
        {error !== null && <p className="error">{error}</p>}
      </form>
    </section>
  );
}
