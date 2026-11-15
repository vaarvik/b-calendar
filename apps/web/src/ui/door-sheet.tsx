import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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
  /** Shown under the content, e.g. the comments. */
  readonly children?: ReactNode;
}

/** A door's content over the calendar. */
export function DoorSheet({ number, content, now, copy, onClose, children }: DoorSheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const below = useRef<HTMLDivElement>(null);
  // Whether what comes under the content (the comments) is on screen; until then a hint shows
  // that there is more, so nobody takes a tall photo for the end of the door.
  const [belowSeen, setBelowSeen] = useState(true);

  useEffect(() => {
    const target = below.current;
    if (target === null || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setBelowSeen(entry?.isIntersecting ?? true);
      },
      { root: panel.current, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, []);

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
      <div className="sheet__panel" ref={panel}>
        <div className="sheet__header">
          <span className="sheet__number">{copy.door(number)}</span>
          <button className="sheet__close" onClick={onClose} aria-label={copy.close}>
            ✕
          </button>
        </div>
        <DoorContent content={content} now={now} copy={copy} />
        {children !== undefined && (
          <>
            <div ref={below}>{children}</div>
            {!belowSeen && (
              <button
                className="sheet__more"
                onClick={() => {
                  below.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                💬 {copy.comments} ↓
              </button>
            )}
          </>
        )}
      </div>
      {content.confetti && <Confetti />}
    </div>
  );
}
