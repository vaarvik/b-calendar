import {
  AuthConfigResponseDtoSchema,
  CalendarDetailsResponseDtoSchema,
  CalendarDtoSchema,
  CalendarListResponseDtoSchema,
  CalendarVersionDtoSchema,
  DoorCommentDtoSchema,
  DoorCommentsResponseDtoSchema,
  DoorPreviewDtoSchema,
  MeResponseDtoSchema,
  MemberDtoSchema,
  SendTestNotificationResponseDtoSchema,
  UploadMediaResponseDtoSchema,
} from '@b-calendar/contracts';
import type {
  AddDoorCommentRequestDto,
  AuthConfigResponseDto,
  MeResponseDto,
  CalendarDetailsResponseDto,
  CalendarDto,
  CalendarSettings,
  CalendarVersionDto,
  DoorCommentDto,
  DoorPreviewDto,
  MemberDto,
  SendTestNotificationResponseDto,
  UploadMediaResponseDto,
} from '@b-calendar/contracts';
import { ApiError } from '../shared/shared.model';
import type { JsonHttpClient, JsonRequest } from '../shared/shared.ports';
import type { AdminClient, DoorDraftDto } from './admin.ports';

/**
 * The session is an HttpOnly cookie the browser sends by itself; every request also says
 * `x-requested-with`, which the API wants on anything that changes something (CSRF).
 */
export class HttpAdminClient implements AdminClient {
  public constructor(private readonly http: JsonHttpClient) {}

  public authConfig(): Promise<AuthConfigResponseDto> {
    return this.http.request({ path: '/v1/auth/config', schema: AuthConfigResponseDtoSchema });
  }

  public async me(): Promise<MeResponseDto | null> {
    try {
      return await this.send({ path: '/v1/me', schema: MeResponseDtoSchema });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      throw error;
    }
  }

  public signInUrl(provider: string, returnTo: string): string {
    return `/v1/auth/${encodeURIComponent(provider)}/start?returnTo=${encodeURIComponent(returnTo)}`;
  }

  public logOut(): Promise<void> {
    return this.send({ method: 'POST', path: '/v1/auth/sign-out' });
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

  public rotateFollowerKey(calendarId: string): Promise<CalendarDto> {
    return this.send({
      method: 'POST',
      path: `/v1/admin/calendars/${calendarId}/key`,
      schema: CalendarDtoSchema,
    });
  }

  public addMember(calendarId: string, name: string): Promise<MemberDto> {
    return this.send({
      method: 'POST',
      path: `/v1/admin/calendars/${calendarId}/members`,
      body: { name },
      schema: MemberDtoSchema,
    });
  }

  public renameMember(memberId: string, name: string): Promise<MemberDto> {
    return this.send({
      method: 'PUT',
      path: `/v1/admin/members/${memberId}`,
      body: { name },
      schema: MemberDtoSchema,
    });
  }

  public rotateMemberKey(memberId: string): Promise<MemberDto> {
    return this.send({
      method: 'POST',
      path: `/v1/admin/members/${memberId}/key`,
      schema: MemberDtoSchema,
    });
  }

  public removeMember(memberId: string): Promise<void> {
    return this.send({ method: 'DELETE', path: `/v1/admin/members/${memberId}` });
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

  public async doorComments(doorId: string): Promise<readonly DoorCommentDto[]> {
    const { comments } = await this.send({
      path: `/v1/admin/doors/${doorId}/comments`,
      schema: DoorCommentsResponseDtoSchema,
    });
    return comments;
  }

  public addComment(doorId: string, comment: AddDoorCommentRequestDto): Promise<DoorCommentDto> {
    return this.send({
      method: 'POST',
      path: `/v1/admin/doors/${doorId}/comments`,
      body: comment,
      schema: DoorCommentDtoSchema,
    });
  }

  public removeComment(commentId: string): Promise<void> {
    return this.send({ method: 'DELETE', path: `/v1/admin/comments/${commentId}` });
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
      headers: { ...request.headers, 'x-requested-with': 'b-calendar' },
    });
  }
}
