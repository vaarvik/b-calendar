import {
  OpenDoorResponseDtoSchema,
  PushConfigResponseDtoSchema,
  RecipientCalendarResponseDtoSchema,
} from '@b-calendar/contracts';
import type {
  CalendarAccess,
  OpenDoorResponseDto,
  PushEndpoint,
  RecipientCalendarResponseDto,
} from '@b-calendar/contracts';
import type { JsonHttpClient } from '../shared/shared.ports';
import type { CalendarClient } from './calendars.ports';

export class HttpCalendarClient implements CalendarClient {
  public constructor(private readonly http: JsonHttpClient) {}

  public view(access: CalendarAccess): Promise<RecipientCalendarResponseDto> {
    return this.http.request({
      path: this.base(access),
      headers: this.headers(access),
      schema: RecipientCalendarResponseDtoSchema,
    });
  }

  public open(access: CalendarAccess, number: number): Promise<OpenDoorResponseDto> {
    return this.http.request({
      method: 'POST',
      path: `${this.base(access)}/doors/${String(number)}/open`,
      headers: this.headers(access),
      schema: OpenDoorResponseDtoSchema,
    });
  }

  public subscribe(access: CalendarAccess, endpoint: PushEndpoint): Promise<void> {
    return this.http.request({
      method: 'POST',
      path: `${this.base(access)}/subscriptions`,
      headers: this.headers(access),
      body: endpoint,
    });
  }

  public async vapidPublicKey(): Promise<string | null> {
    const config = await this.http.request({
      path: '/v1/push/config',
      schema: PushConfigResponseDtoSchema,
    });
    return config.vapidPublicKey;
  }

  private base(access: CalendarAccess): string {
    return `/v1/calendars/${encodeURIComponent(access.slug)}`;
  }

  private headers(access: CalendarAccess): Record<string, string> {
    return { 'x-access-key': access.accessKey };
  }
}
