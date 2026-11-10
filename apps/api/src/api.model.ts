import type { CalendarSettings, DoorDraft } from '@b-calendar/contracts';

/** The first calendar: a birthday week, Sunday 15 to Friday 20 November 2026 (Oslo, UTC+1). */
export const BIRTHDAY_WEEK: {
  readonly settings: CalendarSettings;
  readonly doors: readonly DoorDraft[];
} = {
  settings: {
    slug: 'bursdagsuka',
    title: 'Bursdagsuka',
    recipientName: 'deg',
    theme: 'birthday',
    locale: 'nb',
  },
  doors: [
    {
      number: 1,
      featured: false,
      opensAt: new Date('2026-11-15T09:00:00+01:00'),
      content: {
        title: 'Ta med badetøy 👙',
        message: 'Første hint: pakk badetøy. Mer får du ikke vite ennå …',
        imageUrl: null,
        linkUrl: null,
        countdown: null,
        confetti: false,
      },
      notification: { title: 'Første hint 🎁', body: 'Luke 1 er åpen.' },
    },
    {
      number: 2,
      featured: false,
      opensAt: new Date('2026-11-16T09:00:00+01:00'),
      content: {
        title: 'Dagens hint er en sang 🎶',
        message: 'Hør godt etter.',
        imageUrl: null,
        linkUrl: null,
        countdown: null,
        confetti: false,
      },
      notification: { title: 'Hint nummer to 🎶', body: 'Luke 2 er åpen.' },
    },
    {
      number: 3,
      featured: false,
      opensAt: new Date('2026-11-17T09:00:00+01:00'),
      content: {
        title: 'Hint 3',
        message: 'Kommer …',
        imageUrl: null,
        linkUrl: null,
        countdown: null,
        confetti: false,
      },
      notification: { title: 'Nytt hint 🎁', body: 'Luke 3 er åpen.' },
    },
    {
      number: 4,
      featured: false,
      opensAt: new Date('2026-11-18T09:00:00+01:00'),
      content: {
        title: 'Hint 4',
        message: 'Kommer …',
        imageUrl: null,
        linkUrl: null,
        countdown: null,
        confetti: false,
      },
      notification: { title: 'Nytt hint 🎁', body: 'Luke 4 er åpen.' },
    },
    {
      number: 5,
      featured: true,
      opensAt: new Date('2026-11-19T08:00:00+01:00'),
      content: {
        title: 'Gratulerer med dagen! 🎂',
        message: 'Hipp hipp hurra! Og nå et lite hint om hvor vi skal …',
        imageUrl: null,
        linkUrl: null,
        countdown: null,
        confetti: true,
      },
      notification: { title: 'Gratulerer med dagen! 🎂', body: 'Åpne dagens luke.' },
    },
    {
      number: 6,
      featured: true,
      opensAt: new Date('2026-11-20T12:00:00+01:00'),
      content: {
        title: 'Snart drar vi!',
        message: 'Pakk det siste. Vi drar om en time.',
        imageUrl: null,
        linkUrl: null,
        countdown: { to: new Date('2026-11-20T13:00:00+01:00'), label: 'til vi drar 🚗' },
        confetti: true,
      },
      notification: { title: 'En time igjen ⏳', body: 'Siste luke er åpen.' },
    },
  ],
};
