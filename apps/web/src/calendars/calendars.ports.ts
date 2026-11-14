import type {
  AddDoorCommentRequestDto,
  CalendarAccess,
  DoorCommentDto,
  OpenDoorResponseDto,
  PushEndpoint,
  RecipientCalendarResponseDto,
} from '@b-calendar/contracts';

/** The recipient's side of the API. */
export interface CalendarClient {
  view(access: CalendarAccess): Promise<RecipientCalendarResponseDto>;
  open(access: CalendarAccess, number: number): Promise<OpenDoorResponseDto>;
  subscribe(access: CalendarAccess, endpoint: PushEndpoint): Promise<void>;
  /** The comments behind an opened door, oldest first. */
  comments(access: CalendarAccess, number: number): Promise<readonly DoorCommentDto[]>;
  comment(
    access: CalendarAccess,
    number: number,
    comment: AddDoorCommentRequestDto,
  ): Promise<DoorCommentDto>;
  /** null when the server does not send notifications. */
  vapidPublicKey(): Promise<string | null>;
}

/** Remembers the key of each calendar opened on this device. */
export interface AccessKeyStorage {
  find(slug: string): string | null;
  save(access: CalendarAccess): void;
}

/** Remembers the name a follower comments with, per calendar, on this device. */
export interface CommenterNameStorage {
  find(slug: string): string | null;
  save(slug: string, name: string): void;
}
