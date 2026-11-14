import { useEffect, useState } from 'react';
import type { DoorCommentDto } from '@b-calendar/contracts';
import { useServices } from '../app/services';

/** A door's comments for the admin, each with a delete button. Only published doors have any. */
export function AdminDoorComments({ doorId }: { readonly doorId: string }) {
  const { admin } = useServices();
  const [comments, setComments] = useState<readonly DoorCommentDto[] | null>(null);

  useEffect(() => {
    admin.doorComments(doorId).then(setComments, () => {
      setComments([]);
    });
  }, [admin, doorId]);

  if (comments === null || comments.length === 0) {
    return null;
  }
  return (
    <section className="door-form door-form__section comments">
      <h3 className="comments__title">💬 Kommentarer ({comments.length})</h3>
      <ul className="comments__list">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className={`comments__item${comment.role === 'recipient' ? ' comments__item--hers' : ''}`}
          >
            <span className="comments__meta">
              {comment.author}
              {comment.role === 'follower' ? ' (følger)' : ''} ·{' '}
              {new Date(comment.createdAt).toLocaleString('nb-NO')}
            </span>
            <span className="comments__text">{comment.text}</span>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                if (confirm('Slette kommentaren?')) {
                  admin.removeComment(comment.id).then(
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
          </li>
        ))}
      </ul>
    </section>
  );
}
