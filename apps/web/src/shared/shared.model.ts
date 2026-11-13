import type { CalendarLocale } from '@b-calendar/contracts';

/** Fixed UI copy for the recipient, per calendar locale. Door content is written by hand. */
export interface RecipientCopy {
  readonly hello: (name: string) => string;
  /** Shown on a follower's link. */
  readonly following: (name: string) => string;
  readonly nextDoorIn: string;
  readonly allOpen: string;
  /** Before the first door is published. */
  readonly comingSoon: string;
  readonly open: string;
  readonly opensAt: (when: string) => string;
  readonly close: string;
  readonly days: string;
  readonly hours: string;
  readonly minutes: string;
  readonly seconds: string;
  readonly countdownDone: string;
  readonly listen: string;
  readonly pause: string;
  /** Over a door's song. */
  readonly songForYou: string;
  readonly openLink: string;
  readonly notifyTitle: string;
  readonly notifyBody: string;
  readonly notifyButton: string;
  readonly notifyOn: string;
  readonly notifyBlocked: string;
  readonly installTitle: string;
  readonly installSteps: readonly string[];
  readonly badLink: string;
  readonly offline: string;
  readonly door: (number: number) => string;
}

export const RECIPIENT_COPY: Readonly<Record<CalendarLocale, RecipientCopy>> = {
  nb: {
    hello: (name) => `Hei, ${name}`,
    following: (name) =>
      `👀 Du følger med på ${name}s kalender. Åpner du en luke, teller det ikke for ${name}.`,
    nextDoorIn: 'Neste luke åpner om',
    allOpen: 'Alle lukene er åpne 💛',
    comingSoon: 'Kommer snart … 🎁',
    open: 'Åpne',
    opensAt: (when) => `Åpner ${when}`,
    close: 'Lukk',
    days: 'd',
    hours: 't',
    minutes: 'm',
    seconds: 's',
    countdownDone: 'Nå! 🎉',
    listen: 'Hør',
    pause: 'Pause',
    songForYou: 'En sang til deg',
    openLink: 'Åpne lenken',
    notifyTitle: 'Få beskjed når en luke åpner',
    notifyBody: 'Slå på varsler, så får du et pling hver gang det er noe nytt.',
    notifyButton: 'Slå på varsler',
    notifyOn: 'Varsler er på ✓',
    notifyBlocked: 'Varsler er slått av. Slå dem på i innstillingene for nettleseren.',
    installTitle: 'Legg kalenderen på Hjem-skjermen',
    installSteps: [
      'Trykk på Del-knappen nederst i Safari (firkanten med pil opp).',
      'Velg «Legg til på Hjem-skjerm».',
      'Åpne kalenderen fra Hjem-skjermen og slå på varsler der.',
    ],
    badLink: 'Denne lenken åpner ingen kalender. Bruk lenken du fikk.',
    offline: 'Får ikke kontakt. Prøver igjen …',
    door: (number) => `Luke ${String(number)}`,
  },
  en: {
    hello: (name) => `Hi, ${name}`,
    following: (name) =>
      `👀 You are following ${name}'s calendar. Opening a door here does not count for ${name}.`,
    nextDoorIn: 'Next door opens in',
    allOpen: 'Every door is open 💛',
    comingSoon: 'Coming soon … 🎁',
    open: 'Open',
    opensAt: (when) => `Opens ${when}`,
    close: 'Close',
    days: 'd',
    hours: 'h',
    minutes: 'm',
    seconds: 's',
    countdownDone: 'Now! 🎉',
    listen: 'Listen',
    pause: 'Pause',
    songForYou: 'A song for you',
    openLink: 'Open the link',
    notifyTitle: 'Know when a door opens',
    notifyBody: 'Turn on notifications to get a ping whenever there is something new.',
    notifyButton: 'Turn on notifications',
    notifyOn: 'Notifications are on ✓',
    notifyBlocked: 'Notifications are off. Turn them on in your browser settings.',
    installTitle: 'Add the calendar to your Home Screen',
    installSteps: [
      'Tap Share at the bottom of Safari (the square with an arrow).',
      'Choose “Add to Home Screen”.',
      'Open the calendar from your Home Screen and turn on notifications there.',
    ],
    badLink: 'This link does not open a calendar. Use the link you were given.',
    offline: 'No connection. Trying again …',
    door: (number) => `Door ${String(number)}`,
  },
};

export const INTL_LOCALE: Readonly<Record<CalendarLocale, string>> = { nb: 'nb-NO', en: 'en-GB' };

/** A failed API request. `status` 0 means the network failed. */
export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
