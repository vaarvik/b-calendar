import type { PushReadiness } from '../notifications/notifications.ports';
import type { RecipientCopy } from '../shared/shared.model';

interface NotifyCardProps {
  readonly readiness: PushReadiness;
  readonly busy: boolean;
  readonly copy: RecipientCopy;
  readonly onEnable: () => void;
}

/** Gets her to turn notifications on: install first on iOS, then one tap. */
export function NotifyCard({ readiness, busy, copy, onEnable }: NotifyCardProps) {
  if (readiness === 'unsupported') {
    return null;
  }
  if (readiness === 'on') {
    return <p className="notify-on">{copy.notifyOn}</p>;
  }
  if (readiness === 'install') {
    return (
      <section className="card">
        <h2 className="card__title">{copy.installTitle}</h2>
        <ol className="card__steps">
          {copy.installSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    );
  }
  if (readiness === 'blocked') {
    return <p className="notify-on notify-on--muted">{copy.notifyBlocked}</p>;
  }
  return (
    <section className="card">
      <h2 className="card__title">{copy.notifyTitle}</h2>
      <p className="card__body">{copy.notifyBody}</p>
      <button className="button" onClick={onEnable} disabled={busy}>
        {copy.notifyButton}
      </button>
    </section>
  );
}
