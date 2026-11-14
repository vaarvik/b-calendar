import type { Calendar, DoorCommentsResponseDto } from '@b-calendar/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApi } from '../shared/test-api.js';

const HOUR = 3_600_000;

function at(instant: Date): { opensOn: string; openTime: string } {
  const iso = instant.toISOString();
  return { opensOn: iso.slice(0, 10), openTime: iso.slice(11, 16) };
}

describe('comments behind a door over HTTP', () => {
  let api: TestApi;
  let calendar: Calendar;

  beforeEach(async () => {
    api = await TestApi.start();
    calendar = await api.root.createCalendar.execute({
      slug: 'ida-30',
      title: 'Bursdagsuka',
      recipientName: 'Karoline',
      theme: 'birthday',
      locale: 'nb',
      timeZone: 'UTC',
      defaultOpenTime: '08:00',
    });
    const content = {
      title: 'Luke',
      message: '',
      imageUrl: null,
      secondImageUrl: null,
      videoUrl: null,
      audioUrl: null,
      linkUrl: null,
      countdown: null,
      confetti: false,
    };
    const notification = { title: 'Ny luke', body: '' };
    for (const when of [new Date(Date.now() - HOUR), new Date(Date.now() + HOUR)]) {
      await api.root.addDoor.execute({
        calendarId: calendar.id,
        draft: { ...at(when), featured: false, hidden: false, content, notification },
      });
    }
    await api.root.publishCalendar.execute({ calendarId: calendar.id });
  });

  afterEach(() => api.close());

  const post = (key: string, number: number, payload: object) =>
    api.app.inject({
      method: 'POST',
      url: `/v1/calendars/ida-30/doors/${String(number)}/comments`,
      headers: { 'x-access-key': key },
      payload,
    });

  it('takes comments from her and from a named follower, and shows them to both', async () => {
    const hers = await post(calendar.accessKey, 1, { text: 'Gleder meg!' });
    const theirs = await post(calendar.followerKey, 1, { author: 'Johann', text: 'Jeg også' });
    const list = await api.app.inject({
      url: '/v1/calendars/ida-30/doors/1/comments',
      headers: { 'x-access-key': calendar.followerKey },
    });

    expect(hers.statusCode).toBe(201);
    expect(theirs.statusCode).toBe(201);
    expect(list.json<DoorCommentsResponseDto>().comments).toMatchObject([
      { author: 'Karoline', role: 'recipient', text: 'Gleder meg!' },
      { author: 'Johann', role: 'follower', text: 'Jeg også' },
    ]);
  });

  it('refuses a locked door, an empty comment and a wrong key', async () => {
    const locked = await post(calendar.accessKey, 2, { text: 'Hei' });
    const empty = await post(calendar.accessKey, 1, { text: ' ' });
    const wrong = await post('nope', 1, { text: 'Hei' });

    expect(locked.statusCode).toBe(403);
    expect(empty.statusCode).toBe(400);
    expect(wrong.statusCode).toBe(401);
  });

  it('lets the giver comment behind a door that has not opened, which she cannot see yet', async () => {
    const auth = { authorization: `Bearer ${await api.adminToken()}` };
    const doors = (
      await api.app.inject({ url: `/v1/admin/calendars/${calendar.id}`, headers: auth })
    ).json<{ doors: { id: string }[] }>().doors;
    const created = await api.app.inject({
      method: 'POST',
      url: `/v1/admin/doors/${String(doors[1]?.id)}/comments`,
      headers: auth,
      payload: { author: 'Johann', text: 'Kos deg!' },
    });
    const hers = await api.app.inject({
      url: '/v1/calendars/ida-30/doors/2/comments',
      headers: { 'x-access-key': calendar.accessKey },
    });
    const unknown = await api.app.inject({
      method: 'POST',
      url: '/v1/admin/doors/00000000-0000-4000-8000-000000000000/comments',
      headers: auth,
      payload: { author: 'Johann', text: 'Hei' },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ author: 'Johann', role: 'giver' });
    expect(hers.statusCode).toBe(403);
    expect(unknown.statusCode).toBe(404);
  });

  it('lets the admin read and remove comments', async () => {
    const created = await post(calendar.accessKey, 1, { text: 'Fjern meg' });
    const auth = { authorization: `Bearer ${await api.adminToken()}` };
    const details = await api.root.publishCalendar.execute({ calendarId: calendar.id });
    expect(details.doorCount).toBe(2);
    const doorId = (
      await api.app.inject({ url: `/v1/admin/calendars/${calendar.id}`, headers: auth })
    ).json<{ doors: { id: string; number: number }[] }>().doors[0]?.id;

    const before = await api.app.inject({
      url: `/v1/admin/doors/${String(doorId)}/comments`,
      headers: auth,
    });
    const removed = await api.app.inject({
      method: 'DELETE',
      url: `/v1/admin/comments/${created.json<{ id: string }>().id}`,
      headers: auth,
    });
    const after = await api.app.inject({
      url: `/v1/admin/doors/${String(doorId)}/comments`,
      headers: auth,
    });
    const anonymous = await api.app.inject({ url: `/v1/admin/doors/${String(doorId)}/comments` });

    expect(before.json<DoorCommentsResponseDto>().comments).toHaveLength(1);
    expect(removed.statusCode).toBe(204);
    expect(after.json<DoorCommentsResponseDto>().comments).toEqual([]);
    expect(anonymous.statusCode).toBe(401);
  });
});
