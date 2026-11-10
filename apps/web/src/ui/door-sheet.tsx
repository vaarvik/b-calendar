import { useEffect } from 'react';
import type { OpenDoorContentDto } from '@b-calendar/contracts';
import type { RecipientCopy } from '../shared/shared.model';
import { Confetti } from './confetti';
import { DoorContent } from './door-content';

interface DoorSheetProps {
  readonly number: number;
  readonly content: OpenDoorContentDto;
  readonly now: number;
  readonly copy: RecipientCopy;
  readonly onClose: () => void;
}

/** A door's content over the calendar. */
export function DoorSheet({ number, content, now, copy, onClose }: DoorSheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={copy.door(number)}>
      <button className="sheet__backdrop" aria-label={copy.close} onClick={onClose} />
      <div className="sheet__panel">
        <div className="sheet__header">
          <span className="sheet__number">{copy.door(number)}</span>
          <button className="sheet__close" onClick={onClose} aria-label={copy.close}>
            ✕
          </button>
        </div>
        <DoorContent content={content} now={now} copy={copy} />
      </div>
      {content.confetti && <Confetti />}
    </div>
  );
}
