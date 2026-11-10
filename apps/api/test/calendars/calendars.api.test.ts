import type { Calendar, RecipientCalendarResponseDto } from '@b-calendar/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApi } from '../shared/test-api.js';

const HOUR = 3_600_000;

/** A door's day and own time for an instant, in UTC (the test calendar's time zone). */
function at(instant: Date): { opensOn: string; openTime: string } {
  const iso = instant.toISOString();
  return { opensOn: iso.slice(0, 10), openTime: iso.slice(11, 16) };
}

describe('the recipient’s calendar over HTTP', () => {
  let api: TestApi;
  let calendar: Calendar;

  beforeEach(async () => {
    api = await TestApi.start({
      push: { publicKey: 'BPub', privateKey: 'priv', subject: 'https://b.example' },
    });
    calendar = await api.root.createCalendar.execute({
      slug: 'ida-30',
      title: 'Bursdagsuka',
      recipientName: 'Ida',
      theme: 'birthday',
      locale: 'nb',
      timeZone: 'UTC',
      defaultOpenTime: '08:00',
    });
    const content = {
      message: 'Hemmelig',
      imageUrl: null,
      linkUrl: 'https://open.spotify.com/track/abc',
      countdown: { to: new Date(Date.now() + 2 * HOUR), label: 'til vi drar' },
      confetti: true,
    };
    const notification = { title: 'Ny luke', body: 'Åpne den' };
    await api.root.addDoor.execute({
      calendarId: calendar.id,
      draft: {
        number: 1,
        featured: false,
        ...at(new Date(Date.now() - HOUR)),
        content: { ...content, title: 'Badetøy' },
        notification,
      },
    });
    await api.root.addDoor.execute({
      calendarId: calendar.id,
      draft: {
        number: 2,
        featured: true,
        ...at(new Date(Date.now() + HOUR)),
        content: { ...content, title: 'Hemmelig' },
        notification,
      },
    });
  });

  afterEach(() => api.close());

  const headers = () => ({ 'x-access-key': calendar.accessKey });

  it('shows the doors without the content of locked or unopened ones', async () => {
    const response = await api.app.inject({ url: '/v1/calendars/ida-30', headers: headers() });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const body = response.json<RecipientCalendarResponseDto>();
    expect(body.doors.map((door) => door.state)).toEqual(['ready', 'locked']);
    expect(body.doors.map((door) => door.featured)).toEqual([false, true]);
    expect(response.body).not.toContain('Hemmelig');
  });

  it('opens a ready door, which then stays opened', async () => {
    const opened = await api.app.inject({
      method: 'POST',
      url: '/v1/calendars/ida-30/doors/1/open',
      headers: headers(),
    });

    expect(opened.statusCode).toBe(200);
    expect(opened.json()).toMatchObject({
      number: 1,
      content: {
        title: 'Badetøy',
        confetti: true,
        link: { kind: 'spotify', embedUrl: 'https://open.spotify.com/embed/track/abc' },
        countdown: { label: 'til vi drar' },
      },
    });
    const view = await api.app.inject({ url: '/v1/calendars/ida-30', headers: headers() });
    expect(view.json<RecipientCalendarResponseDto>().doors[0]).toMatchObject({
      state: 'opened',
      content: { title: 'Badetøy' },
    });
  });

  it('refuses to open a locked door, and unknown doors', async () => {
    const locked = await api.app.inject({
      method: 'POST',
      url: '/v1/calendars/ida-30/doors/2/open',
      headers: headers(),
    });
    const missing = await api.app.inject({
      method: 'POST',
      url: '/v1/calendars/ida-30/doors/9/open',
      headers: headers(),
    });

    expect(locked.statusCode).toBe(403);
    expect(locked.json()).toMatchObject({ error: { code: 'door_locked' } });
    expect(missing.statusCode).toBe(404);
  });

  it('refuses a missing or wrong key', async () => {
    const missing = await api.app.inject({ url: '/v1/calendars/ida-30' });
    const wrong = await api.app.inject({
      url: '/v1/calendars/ida-30',
      headers: { 'x-access-key': 'nope' },
    });

    expect(missing.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
  });

  it('stores a push subscription and tells the app the VAPID key', async () => {
    const config = await api.app.inject({ url: '/v1/push/config' });
    const subscribed = await api.app.inject({
      method: 'POST',
      url: '/v1/calendars/ida-30/subscriptions',
      headers: headers(),
      payload: { endpoint: 'https://web.push.apple.com/x', keys: { p256dh: 'p', auth: 'a' } },
    });
    const bad = await api.app.inject({
      method: 'POST',
      url: '/v1/calendars/ida-30/subscriptions',
      headers: headers(),
      payload: { endpoint: 'nope' },
    });

    expect(config.json()).toEqual({ vapidPublicKey: 'BPub' });
    expect(subscribed.statusCode).toBe(204);
    expect(bad.statusCode).toBe(400);
  });

  it('gives each calendar a manifest whose start URL keeps the key', async () => {
    const response = await api.app.inject({
      url: `/c/ida-30/manifest.webmanifest?k=${encodeURIComponent(calendar.accessKey)}`,
    });
    const wrong = await api.app.inject({ url: '/c/ida-30/manifest.webmanifest' });

    expect(response.headers['content-type']).toContain('application/manifest+json');
    expect(response.json()).toMatchObject({
      name: 'Bursdagsuka',
      start_url: `/c/ida-30?k=${encodeURIComponent(calendar.accessKey)}`,
      display: 'standalone',
    });
    expect(wrong.json()).toMatchObject({ name: 'Kalender' });
  });

  it('answers unknown routes with a JSON 404', async () => {
    const response = await api.app.inject({ url: '/v1/nothing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: { code: 'not_found' } });
  });

  it('runs the notification job', async () => {
    await expect(api.root.notifyOpenedDoors.execute()).resolves.toEqual({
      notified: 1,
      skipped: 0,
    });
  });

  it('is healthy', async () => {
    expect((await api.app.inject({ url: '/health' })).json()).toEqual({ status: 'ok' });
  });

  it('does not offer push when it is not configured', async () => {
    const plain = await TestApi.start();
    try {
      expect((await plain.app.inject({ url: '/v1/push/config' })).json()).toEqual({
        vapidPublicKey: null,
      });
    } finally {
      await plain.close();
    }
  });
});
