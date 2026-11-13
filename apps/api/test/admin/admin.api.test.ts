import type {
  CalendarDetailsResponseDto,
  RecipientCalendarResponseDto,
  CalendarDto,
  DoorPreviewDto,
} from '@b-calendar/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApi } from '../shared/test-api.js';

const SETTINGS = {
  slug: 'ida-30',
  title: 'Bursdagsuka',
  recipientName: 'Ida',
  theme: 'birthday',
  locale: 'nb',
  timeZone: 'Europe/Oslo',
  defaultOpenTime: '08:00',
};

const DRAFT = {
  opensOn: '2026-11-15',
  openTime: null,
  content: {
    title: 'Ta med badetøy',
    message: '',
    imageUrl: null,
    videoUrl: null,
    audioUrl: null,
    linkUrl: 'https://youtu.be/dQw4w9WgXcQ',
    countdown: null,
    confetti: false,
  },
  notification: { title: 'Luke 1', body: 'Første hint!' },
};

describe('the admin over HTTP', () => {
  let api: TestApi;
  let auth: { authorization: string };

  beforeEach(async () => {
    api = await TestApi.start();
    auth = { authorization: `Bearer ${await api.adminToken()}` };
  });

  afterEach(() => api.close());

  async function createCalendar(): Promise<CalendarDto> {
    const response = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/calendars',
      headers: auth,
      payload: SETTINGS,
    });
    expect(response.statusCode).toBe(201);
    return response.json<CalendarDto>();
  }

  it('refuses a wrong password and requests without a valid session', async () => {
    const wrong = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/session',
      payload: { password: 'wrong' },
    });
    const anonymous = await api.app.inject({ url: '/v1/admin/calendars' });
    const forged = await api.app.inject({
      url: '/v1/admin/calendars',
      headers: { authorization: 'Bearer 9999999999999.forged' },
    });

    expect(wrong.statusCode).toBe(401);
    expect(anonymous.statusCode).toBe(401);
    expect(forged.statusCode).toBe(401);
  });

  it('creates, lists, updates a calendar and gives it a new key', async () => {
    const calendar = await createCalendar();
    const list = await api.app.inject({ url: '/v1/admin/calendars', headers: auth });
    const updated = await api.app.inject({
      method: 'PUT',
      url: `/v1/admin/calendars/${calendar.id}`,
      headers: auth,
      payload: { ...SETTINGS, theme: 'christmas' },
    });
    const rotated = await api.app.inject({
      method: 'POST',
      url: `/v1/admin/calendars/${calendar.id}/key`,
      headers: auth,
    });

    expect(list.json()).toEqual({ calendars: [calendar] });
    expect(updated.json()).toMatchObject({ theme: 'christmas', accessKey: calendar.accessKey });
    expect(rotated.json<CalendarDto>().accessKey).not.toBe(calendar.accessKey);
  });

  it('refuses invalid settings and a taken slug', async () => {
    await createCalendar();
    const invalid = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/calendars',
      headers: auth,
      payload: { ...SETTINGS, slug: 'Ugly Slug' },
    });
    const taken = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/calendars',
      headers: auth,
      payload: SETTINGS,
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      error: { code: 'validation_failed', issues: [expect.anything()] },
    });
    expect(taken.statusCode).toBe(409);
  });

  it('adds, edits and removes doors, and shows them in full', async () => {
    const calendar = await createCalendar();
    const added = await api.app.inject({
      method: 'POST',
      url: `/v1/admin/calendars/${calendar.id}/doors`,
      headers: auth,
      payload: DRAFT,
    });
    const door = added.json<DoorPreviewDto>();
    const edited = await api.app.inject({
      method: 'PUT',
      url: `/v1/admin/doors/${door.id}`,
      headers: auth,
      payload: {
        ...DRAFT,
        content: {
          ...DRAFT.content,
          countdown: { to: '2026-11-20T13:00:00+01:00', label: 'til vi drar' },
        },
      },
    });
    const details = await api.app.inject({
      url: `/v1/admin/calendars/${calendar.id}`,
      headers: auth,
    });
    const removed = await api.app.inject({
      method: 'DELETE',
      url: `/v1/admin/doors/${door.id}`,
      headers: auth,
    });
    const after = await api.app.inject({
      url: `/v1/admin/calendars/${calendar.id}`,
      headers: auth,
    });

    expect(added.statusCode).toBe(201);
    expect(door).toMatchObject({
      opensAt: '2026-11-15T07:00:00.000Z',
      link: { kind: 'youtube' },
      notifiedAt: null,
    });
    expect(edited.json()).toMatchObject({
      content: { countdown: { to: '2026-11-20T12:00:00.000Z' } },
    });
    expect(details.json<CalendarDetailsResponseDto>()).toMatchObject({
      subscriberCount: 0,
      unpublishedChanges: true,
      versions: [],
      doors: [{ id: door.id, number: 1 }],
    });
    expect(removed.statusCode).toBe(204);
    expect(after.json<CalendarDetailsResponseDto>().doors).toEqual([]);
  });

  it('publishes the draft as numbered versions', async () => {
    const calendar = await createCalendar();
    await api.app.inject({
      method: 'POST',
      url: `/v1/admin/calendars/${calendar.id}/doors`,
      headers: auth,
      payload: DRAFT,
    });
    const publish = () =>
      api.app.inject({
        method: 'POST',
        url: `/v1/admin/calendars/${calendar.id}/publish`,
        headers: auth,
      });

    const first = await publish();
    const second = await publish();
    const details = await api.app.inject({
      url: `/v1/admin/calendars/${calendar.id}`,
      headers: auth,
    });
    const recipient = await api.app.inject({
      url: `/v1/calendars/${calendar.slug}`,
      headers: { 'x-access-key': calendar.accessKey },
    });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ version: 1, doorCount: 1 });
    expect(second.json()).toMatchObject({ version: 2, doorCount: 1 });
    expect(details.json<CalendarDetailsResponseDto>()).toMatchObject({
      unpublishedChanges: false,
      versions: [{ version: 2 }, { version: 1 }],
    });
    expect(recipient.json<RecipientCalendarResponseDto>().doors).toHaveLength(1);
  });

  it('refuses an invalid door and unknown ids', async () => {
    const calendar = await createCalendar();
    const invalid = await api.app.inject({
      method: 'POST',
      url: `/v1/admin/calendars/${calendar.id}/doors`,
      headers: auth,
      payload: { ...DRAFT, opensOn: '15.11.2026' },
    });
    const notUuid = await api.app.inject({ url: '/v1/admin/calendars/nope', headers: auth });
    const unknown = await api.app.inject({
      url: '/v1/admin/calendars/00000000-0000-4000-8000-000000000000',
      headers: auth,
    });

    expect(invalid.statusCode).toBe(400);
    expect(notUuid.statusCode).toBe(400);
    expect(unknown.statusCode).toBe(404);
  });

  it('sends a test notification to nobody when nobody subscribed', async () => {
    const calendar = await createCalendar();
    const response = await api.app.inject({
      method: 'POST',
      url: `/v1/admin/calendars/${calendar.id}/test-notification`,
      headers: auth,
    });

    expect(response.json()).toEqual({ sent: 0, failed: 0 });
  });

  it('uploads an image and serves it', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const upload = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/media',
      headers: { ...auth, 'content-type': 'image/png' },
      payload: png,
    });
    const { url } = upload.json<{ url: string }>();
    const served = await api.app.inject({ url });
    const anonymous = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/media',
      headers: { 'content-type': 'image/png' },
      payload: png,
    });
    const wrongType = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/media',
      headers: { ...auth, 'content-type': 'text/plain' },
      payload: 'hi',
    });

    expect(upload.statusCode).toBe(201);
    expect(url).toMatch(/^\/media\/[0-9a-f-]+\.png$/);
    expect(served.statusCode).toBe(200);
    expect(served.rawPayload).toEqual(png);
    expect(anonymous.statusCode).toBe(401);
    expect(wrongType.statusCode).toBe(400);
  });

  it('uploads a video and serves it in ranges, so a phone can play and seek it', async () => {
    const video = Buffer.from(Array.from({ length: 64 }, (_, i) => i));
    const upload = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/media',
      headers: { ...auth, 'content-type': 'video/quicktime' },
      payload: video,
    });
    const { url, kind } = upload.json<{ url: string; kind: string }>();
    const part = await api.app.inject({ url, headers: { range: 'bytes=10-19' } });

    expect(upload.statusCode).toBe(201);
    expect(kind).toBe('video');
    expect(url).toMatch(/^\/media\/[0-9a-f-]+\.mov$/);
    expect(part.statusCode).toBe(206);
    expect(part.rawPayload).toEqual(video.subarray(10, 20));
  });

  it('refuses an empty upload', async () => {
    const empty = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/media',
      headers: { ...auth, 'content-type': 'audio/mpeg' },
      payload: Buffer.alloc(0),
    });

    expect(empty.statusCode).toBe(400);
  });

  it('answers malformed JSON with a 400', async () => {
    const response = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/session',
      headers: { 'content-type': 'application/json' },
      payload: '{nope',
    });

    expect(response.statusCode).toBe(400);
  });
});
