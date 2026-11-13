import {
  CalendarDetailsResponseDtoSchema,
  CalendarDtoSchema,
  CalendarListResponseDtoSchema,
  CalendarVersionDtoSchema,
  DoorPreviewDtoSchema,
  LogInResponseDtoSchema,
  SendTestNotificationResponseDtoSchema,
  UploadMediaResponseDtoSchema,
} from '@b-calendar/contracts';
import type {
  CalendarDetailsResponseDto,
  CalendarDto,
  CalendarSettings,
  CalendarVersionDto,
  DoorPreviewDto,
  SendTestNotificationResponseDto,
  UploadMediaResponseDto,
} from '@b-calendar/contracts';
import type { JsonHttpClient, JsonRequest, KeyValueStorage } from '../shared/shared.ports';
import type { AdminClient, DoorDraftDto } from './admin.ports';

const TOKEN = 'admin-token';

export class HttpAdminClient implements AdminClient {
  public constructor(
    private readonly http: JsonHttpClient,
    private readonly storage: KeyValueStorage,
  ) {}

  public signedIn(): boolean {
    return this.storage.get(TOKEN) !== null;
  }

  public async logIn(password: string): Promise<void> {
    const session = await this.http.request({
      method: 'POST',
      path: '/v1/admin/session',
      body: { password },
      schema: LogInResponseDtoSchema,
    });
    this.storage.set(TOKEN, session.token);
  }

  public logOut(): void {
    this.storage.remove(TOKEN);
  }

  public async listCalendars(): Promise<readonly CalendarDto[]> {
    const list = await this.send({
      path: '/v1/admin/calendars',
      schema: CalendarListResponseDtoSchema,
    });
    return list.calendars;
  }

  public createCalendar(settings: CalendarSettings): Promise<CalendarDto> {
    return this.send({
      method: 'POST',
      path: '/v1/admin/calendars',
      body: settings,
      schema: CalendarDtoSchema,
    });
  }

  public updateCalendar(calendarId: string, settings: CalendarSettings): Promise<CalendarDto> {
    return this.send({
      method: 'PUT',
      path: `/v1/admin/calendars/${calendarId}`,
      body: settings,
      schema: CalendarDtoSchema,
    });
  }

  public rotateKey(calendarId: string): Promise<CalendarDto> {
    return this.send({
      method: 'POST',
      path: `/v1/admin/calendars/${calendarId}/key`,
      schema: CalendarDtoSchema,
    });
  }

  public calendar(calendarId: string): Promise<CalendarDetailsResponseDto> {
    return this.send({
      path: `/v1/admin/calendars/${calendarId}`,
      schema: CalendarDetailsResponseDtoSchema,
    });
  }

  public addDoor(calendarId: string, draft: DoorDraftDto): Promise<DoorPreviewDto> {
    return this.send({
      method: 'POST',
      path: `/v1/admin/calendars/${calendarId}/doors`,
      body: draft,
      schema: DoorPreviewDtoSchema,
    });
  }

  public editDoor(doorId: string, draft: DoorDraftDto): Promise<DoorPreviewDto> {
    return this.send({
      method: 'PUT',
      path: `/v1/admin/doors/${doorId}`,
      body: draft,
      schema: DoorPreviewDtoSchema,
    });
  }

  public removeDoor(doorId: string): Promise<void> {
    return this.send({ method: 'DELETE', path: `/v1/admin/doors/${doorId}` });
  }

  public publish(calendarId: string): Promise<CalendarVersionDto> {
    return this.send({
      method: 'POST',
      path: `/v1/admin/calendars/${calendarId}/publish`,
      schema: CalendarVersionDtoSchema,
    });
  }

  public sendTestNotification(calendarId: string): Promise<SendTestNotificationResponseDto> {
    return this.send({
      method: 'POST',
      path: `/v1/admin/calendars/${calendarId}/test-notification`,
      schema: SendTestNotificationResponseDtoSchema,
    });
  }

  public uploadMedia(file: Blob): Promise<UploadMediaResponseDto> {
    return this.send({
      method: 'POST',
      path: '/v1/admin/media',
      body: file,
      schema: UploadMediaResponseDtoSchema,
    });
  }

  private send<T>(request: JsonRequest<T>): Promise<T> {
    return this.http.request({
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${this.storage.get(TOKEN) ?? ''}` },
    });
  }
}
