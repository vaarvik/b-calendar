import type {
  CalendarDetailsResponseDto,
  CalendarDto,
  MemberDto,
  RecipientCalendarResponseDto,
} from '@b-calendar/contracts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestApi } from '../shared/test-api.js';

describe('members over HTTP', () => {
  let api: TestApi;
  let auth: Record<string, string>;
  let calendar: CalendarDto;

  beforeEach(async () => {
    api = await TestApi.start();
    auth = await api.adminHeaders();
    calendar = (
      await api.app.inject({
        method: 'POST',
        url: '/v1/admin/calendars',
        headers: auth,
        payload: {
          slug: 'jul',
          title: 'Julekalender',
          theme: 'christmas',
          locale: 'nb',
          timeZone: 'Europe/Oslo',
          defaultOpenTime: '08:00',
        },
      })
    ).json<CalendarDto>();
  });

  afterEach(() => api.close());

  const add = (name: string) =>
    api.app.inject({
      method: 'POST',
      url: `/v1/admin/calendars/${calendar.id}/members`,
      headers: auth,
      payload: { name },
    });

  const view = (key: string) =>
    api.app.inject({ url: '/v1/calendars/jul', headers: { 'x-access-key': key } });

  it('adds members, each with their own working link, and lists them in the details', async () => {
    const ida = await add('Ida');
    const johann = await add('Johann');
    const details = await api.app.inject({
      url: `/v1/admin/calendars/${calendar.id}`,
      headers: auth,
    });

    expect(ida.statusCode).toBe(201);
    const idaDto = ida.json<MemberDto>();
    expect(idaDto).toMatchObject({ name: 'Ida' });
    expect(details.json<CalendarDetailsResponseDto>().members).toEqual([
      idaDto,
      johann.json<MemberDto>(),
    ]);
    expect((await view(idaDto.key)).json<RecipientCalendarResponseDto>()).toMatchObject({
      viewer: 'member',
      name: 'Ida',
    });
  });

  it('renames a member, gives them a new key, and removes them', async () => {
    const ida = (await add('Ida')).json<MemberDto>();

    const renamed = await api.app.inject({
      method: 'PUT',
      url: `/v1/admin/members/${ida.id}`,
      headers: auth,
      payload: { name: 'Ida K' },
    });
    const rotated = await api.app.inject({
      method: 'POST',
      url: `/v1/admin/members/${ida.id}/key`,
      headers: auth,
    });
    const newKey = rotated.json<MemberDto>().key;

    expect(renamed.json()).toMatchObject({ name: 'Ida K', key: ida.key });
    expect(newKey).not.toBe(ida.key);
    expect((await view(ida.key)).statusCode).toBe(401);
    expect((await view(newKey)).statusCode).toBe(200);

    const removed = await api.app.inject({
      method: 'DELETE',
      url: `/v1/admin/members/${ida.id}`,
      headers: auth,
    });
    expect(removed.statusCode).toBe(204);
    expect((await view(newKey)).statusCode).toBe(401);
  });

  it('refuses an empty name, unknown members and requests without a session', async () => {
    const empty = await add(' ');
    const unknown = await api.app.inject({
      method: 'DELETE',
      url: '/v1/admin/members/00000000-0000-4000-8000-000000000000',
      headers: auth,
    });
    const anonymous = await api.app.inject({
      method: 'POST',
      url: `/v1/admin/calendars/${calendar.id}/members`,
      payload: { name: 'Ida' },
    });

    expect(empty.statusCode).toBe(400);
    expect(unknown.statusCode).toBe(404);
    expect(anonymous.statusCode).toBe(401);
  });
});
