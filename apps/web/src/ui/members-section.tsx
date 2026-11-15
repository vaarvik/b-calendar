import { useState } from 'react';
import type { CalendarDetailsResponseDto, MemberDto } from '@b-calendar/contracts';
import { useServices } from '../app/services';

interface MembersSectionProps {
  readonly details: CalendarDetailsResponseDto;
  /** The time now, in ms: doors opened by then count. */
  readonly now: number;
  /** Reload the calendar after a change. */
  readonly onChanged: () => void;
  readonly onNotice: (notice: string) => void;
}

const NOT_A_LOGIN = {
  autoComplete: 'off',
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
} as const;

function linkOf(slug: string, key: string): string {
  return `${location.origin}/c/${slug}?k=${encodeURIComponent(key)}`;
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : 'Noe gikk galt.';
}

/** One person: their link, how far they have come, and what the admin can do about them. */
function MemberRow({
  member,
  details,
  now,
  onChanged,
  onNotice,
}: MembersSectionProps & { readonly member: MemberDto }) {
  const { admin } = useServices();
  const [name, setName] = useState(member.name);
  const link = linkOf(details.calendar.slug, member.key);
  // Doors whose time has come: the ones a person could have opened by now.
  const due = details.doors.filter((door) => Date.parse(door.opensAt) <= now).length;
  const opened = details.doors.filter((door) =>
    door.openings.some((opening) => opening.memberId === member.id),
  ).length;
  const run = (action: Promise<unknown>, done: string) => {
    action.then(
      () => {
        onNotice(done);
        onChanged();
      },
      (caught: unknown) => {
        onNotice(failure(caught));
      },
    );
  };

  return (
    <li className="member">
      <div className="member__head">
        <input
          {...NOT_A_LOGIN}
          className="member__name"
          aria-label="Navn"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          onBlur={() => {
            if (name.trim() !== '' && name.trim() !== member.name) {
              run(admin.renameMember(member.id, name.trim()), 'Navn lagret ✓');
            }
          }}
        />
        <span className={`chip${due > 0 && opened === due ? ' chip--good' : ''}`}>
          👀 {opened} av {due} åpnet
        </span>
      </div>
      <a className="admin__link" href={link} target="_blank" rel="noreferrer">
        {link}
      </a>
      <div className="door-form__actions">
        <button
          className="button"
          onClick={() => {
            void navigator.clipboard.writeText(link).then(() => {
              onNotice(`Lenken til ${member.name} er kopiert ✓`);
            });
          }}
        >
          📋 Kopier lenke
        </button>
        <button
          className="button button--ghost"
          onClick={() => {
            if (
              confirm(
                `Ny lenke til ${member.name}? Den gamle slutter å virke, også på Hjem-skjermen.`,
              )
            ) {
              run(admin.rotateMemberKey(member.id), `Ny lenke til ${member.name} ✓`);
            }
          }}
        >
          🔄 Ny lenke
        </button>
        <button
          className="button button--danger"
          onClick={() => {
            if (
              confirm(`Fjerne ${member.name}? Lenken slutter å virke. Kommentarene blir stående.`)
            ) {
              run(admin.removeMember(member.id), `${member.name} er fjernet`);
            }
          }}
        >
          🗑 Fjern
        </button>
      </div>
    </li>
  );
}

/** The people sharing the calendar, each with their own link and their own opened doors. */
export function MembersSection({ details, now, onChanged, onNotice }: MembersSectionProps) {
  const { admin } = useServices();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  return (
    <fieldset className="door-form__section">
      <legend>👥 Personer</legend>
      <p className="admin__muted">
        Hver person får sin egen lenke og åpner lukene selv. Hold lenkene hemmelige: lenken er hvem
        man er.
      </p>
      {details.members.length === 0 ? (
        <p className="admin__muted">Ingen ennå. Legg til den første under.</p>
      ) : (
        <ul className="members">
          {details.members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              details={details}
              now={now}
              onChanged={onChanged}
              onNotice={onNotice}
            />
          ))}
        </ul>
      )}
      <form
        className="member__add"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() === '') {
            return;
          }
          setAdding(true);
          admin
            .addMember(details.calendar.id, name.trim())
            .then(
              (member) => {
                setName('');
                onNotice(`${member.name} er lagt til ✓ – kopier lenken og send den.`);
                onChanged();
              },
              (caught: unknown) => {
                onNotice(failure(caught));
              },
            )
            .finally(() => {
              setAdding(false);
            });
        }}
      >
        <input
          {...NOT_A_LOGIN}
          className="member__name"
          aria-label="Navn på ny person"
          placeholder="Navn"
          maxLength={40}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <button className="button" type="submit" disabled={adding || name.trim() === ''}>
          ＋ Legg til
        </button>
      </form>
    </fieldset>
  );
}
