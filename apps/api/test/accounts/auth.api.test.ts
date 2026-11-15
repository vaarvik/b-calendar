import type { CalendarDto, DoorPreviewDto, MemberDto } from '@b-calendar/contracts';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TestApi } from '../shared/test-api.js';
import { LocalOidcIssuer } from './local-oidc-issuer.js';

const SETTINGS = {
  slug: 'jul',
  title: 'Julekalender',
  theme: 'christmas',
  locale: 'nb',
  timeZone: 'Europe/Oslo',
  defaultOpenTime: '08:00',
};

const DRAFT = {
  opensOn: '2026-11-15',
  openTime: null,
  content: {
    title: 'Luke',
    message: '',
    imageUrl: null,
    secondImageUrl: null,
    videoUrl: null,
    audioUrl: null,
    linkUrl: null,
    countdown: null,
    confetti: false,
  },
  notification: { title: 'Luke 1', body: '' },
};

describe('signing in with SSO over HTTP', () => {
  const issuer = new LocalOidcIssuer();
  let api: TestApi;

  beforeAll(() => issuer.start());
  afterAll(() => issuer.stop());

  beforeEach(async () => {
    api = await TestApi.start({
      google: { clientId: 'cal-client', clientSecret: 'secret', discoveryUrl: issuer.discoveryUrl },
      limits: { calendars: 2, mediaBytes: 1024 * 1024, membersPerCalendar: 30 },
    });
  });

  afterEach(() => api.close());

  /** The browser's round trip: start, sign in at the provider, come back. */
  async function signIn(
    claims: Record<string, unknown>,
    returnTo = '/admin',
  ): Promise<{ headers: Record<string, string>; location: string }> {
    const started = await api.app.inject({
      url: `/v1/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`,
    });
    expect(started.statusCode).toBe(302);
    const signInCookie = started.cookies.find((cookie) => cookie.name === 'bcal_sign_in');
    expect(signInCookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/v1/auth' });
    const { code, state } = issuer.authorize(String(started.headers.location), claims);
    const back = await api.app.inject({
      url: `/v1/auth/google/callback?code=${code}&state=${state}`,
      headers: { cookie: `bcal_sign_in=${String(signInCookie?.value)}` },
    });
    expect(back.statusCode).toBe(302);
    return { headers: api.headersOf(back.cookies), location: String(back.headers.location) };
  }

  const person = (sub: string, email: string, name: string) => ({
    sub,
    email,
    email_verified: true,
    name,
  });

  it('tells the app how one can sign in', async () => {
    const config = await api.app.inject({ url: '/v1/auth/config' });

    expect(config.json()).toEqual({ providers: ['google'] });
  });

  it('signs in, lands where it started, knows who is signed in, and signs out', async () => {
    const { headers, location } = await signIn(person('a', 'ann@example.com', 'Ann'), '/admin/x');
    const me = await api.app.inject({ url: '/v1/me', headers });
    const out = await api.app.inject({ method: 'POST', url: '/v1/auth/sign-out' });

    expect(location).toBe('/admin/x');
    expect(me.json()).toEqual({ account: { name: 'Ann', email: 'ann@example.com' } });
    expect(out.cookies.find((cookie) => cookie.name === 'bcal_session')?.value).toBe('');
  });

  it('keeps every account to its own calendars, doors, people and comments', async () => {
    const ann = (await signIn(person('a', 'ann@example.com', 'Ann'))).headers;
    const bob = (await signIn(person('b', 'bob@example.com', 'Bob'))).headers;
    const calendar = (
      await api.app.inject({
        method: 'POST',
        url: '/v1/admin/calendars',
        headers: ann,
        payload: SETTINGS,
      })
    ).json<CalendarDto>();
    const door = (
      await api.app.inject({
        method: 'POST',
        url: `/v1/admin/calendars/${calendar.id}/doors`,
        headers: ann,
        payload: DRAFT,
      })
    ).json<DoorPreviewDto>();
    await api.app.inject({
      method: 'POST',
      url: `/v1/admin/calendars/${calendar.id}/publish`,
      headers: ann,
    });
    const member = (
      await api.app.inject({
        method: 'POST',
        url: `/v1/admin/calendars/${calendar.id}/members`,
        headers: ann,
        payload: { name: 'Ida' },
      })
    ).json<MemberDto>();
    const comment = (
      await api.app.inject({
        method: 'POST',
        url: `/v1/admin/doors/${door.id}/comments`,
        headers: ann,
        payload: { author: 'Ann', text: 'Hei' },
      })
    ).json<{ id: string }>();
    expect(comment.id).toBeDefined();

    const attempts: [string, string, object?][] = [
      ['GET', `/v1/admin/calendars/${calendar.id}`],
      ['PUT', `/v1/admin/calendars/${calendar.id}`, SETTINGS],
      ['POST', `/v1/admin/calendars/${calendar.id}/key`],
      ['POST', `/v1/admin/calendars/${calendar.id}/publish`],
      ['POST', `/v1/admin/calendars/${calendar.id}/test-notification`],
      ['POST', `/v1/admin/calendars/${calendar.id}/doors`, DRAFT],
      ['PUT', `/v1/admin/doors/${door.id}`, DRAFT],
      ['DELETE', `/v1/admin/doors/${door.id}`],
      ['GET', `/v1/admin/doors/${door.id}/comments`],
      ['POST', `/v1/admin/doors/${door.id}/comments`, { author: 'Bob', text: 'Hei' }],
      ['DELETE', `/v1/admin/comments/${comment.id}`],
      ['POST', `/v1/admin/calendars/${calendar.id}/members`, { name: 'Bob' }],
      ['PUT', `/v1/admin/members/${member.id}`, { name: 'Bob' }],
      ['POST', `/v1/admin/members/${member.id}/key`],
      ['DELETE', `/v1/admin/members/${member.id}`],
    ];
    for (const [method, url, payload] of attempts) {
      const response = await api.app.inject({
        method: method as 'GET',
        url,
        headers: bob,
        ...(payload === undefined ? {} : { payload }),
      });
      expect({ method, url, status: response.statusCode }).toEqual({ method, url, status: 404 });
    }
    const bobs = await api.app.inject({ url: '/v1/admin/calendars', headers: bob });
    expect(bobs.json()).toEqual({ calendars: [] });
    const still = await api.app.inject({ url: `/v1/admin/calendars/${calendar.id}`, headers: ann });
    expect(still.json()).toMatchObject({ members: [{ name: 'Ida' }], doors: [{ id: door.id }] });
  });

  it('stops at the account’s limit with a 409 that names it', async () => {
    const { headers } = await signIn(person('a', 'ann@example.com', 'Ann'));
    const create = (slug: string) =>
      api.app.inject({
        method: 'POST',
        url: '/v1/admin/calendars',
        headers,
        payload: { ...SETTINGS, slug },
      });

    await create('en');
    await create('to');
    const third = await create('tre');

    expect(third.statusCode).toBe(409);
    expect(third.json()).toMatchObject({
      error: { code: 'limit_exceeded', limit: 'calendars', max: 2 },
    });
  });

  it('wants the request header on anything that changes, and a valid session on everything', async () => {
    const { headers } = await signIn(person('a', 'ann@example.com', 'Ann'));
    const withoutHeader = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/calendars',
      headers: { cookie: headers.cookie ?? '' },
      payload: SETTINGS,
    });
    const reading = await api.app.inject({
      url: '/v1/admin/calendars',
      headers: { cookie: headers.cookie ?? '' },
    });
    const none = await api.app.inject({ url: '/v1/me' });

    expect(withoutHeader.statusCode).toBe(401);
    expect(reading.statusCode).toBe(200);
    expect(none.statusCode).toBe(401);
  });

  it('sends a cancelled or failed sign-in back to the admin with a reason', async () => {
    const cancelled = await api.app.inject({ url: '/v1/auth/google/callback?error=access_denied' });
    const started = await api.app.inject({ url: '/v1/auth/google/start' });
    const cookie = started.cookies.find((c) => c.name === 'bcal_sign_in');
    const { code } = issuer.authorize(String(started.headers.location), { sub: 'x' });
    const forged = await api.app.inject({
      url: `/v1/auth/google/callback?code=${code}&state=forged`,
      headers: { cookie: `bcal_sign_in=${String(cookie?.value)}` },
    });
    const unknown = await api.app.inject({ url: '/v1/auth/apple/start' });

    expect(cancelled.headers.location).toBe('/admin?innlogging=avbrutt');
    expect(forged.headers.location).toBe('/admin?innlogging=feilet');
    expect(forged.cookies.find((c) => c.name === 'bcal_session')).toBeUndefined();
    expect(unknown.statusCode).toBe(404);
  });
});

describe('a provider that cannot be reached', () => {
  it('sends the browser back to the sign-in page instead of an error', async () => {
    const api = await TestApi.start({
      google: { clientId: 'c', clientSecret: 's', discoveryUrl: 'http://127.0.0.1:9/none' },
    });
    try {
      const started = await api.app.inject({ url: '/v1/auth/google/start' });

      expect(started.statusCode).toBe(302);
      expect(started.headers.location).toBe('/admin?innlogging=feilet');
    } finally {
      await api.close();
    }
  });
});

describe('the retired password', () => {
  it('no longer signs in', async () => {
    const api = await TestApi.start();
    try {
      const attempt = await api.app.inject({
        method: 'POST',
        url: '/v1/admin/session',
        payload: { password: 'correct horse battery' },
      });

      expect(attempt.statusCode).toBe(404);
    } finally {
      await api.close();
    }
  });
});
