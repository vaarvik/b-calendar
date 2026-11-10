import type {
  CalendarAccess,
  OpenDoorResponseDto,
  PushEndpoint,
  RecipientCalendarResponseDto,
} from '@b-calendar/contracts';

/** The recipient's side of the API. */
export interface CalendarClient {
  view(access: CalendarAccess): Promise<RecipientCalendarResponseDto>;
  open(access: CalendarAccess, number: number): Promise<OpenDoorResponseDto>;
  subscribe(access: CalendarAccess, endpoint: PushEndpoint): Promise<void>;
  /** null when the server does not send notifications. */
  vapidPublicKey(): Promise<string | null>;
}

/** Remembers the key of each calendar opened on this device. */
export interface AccessKeyStorage {
  find(slug: string): string | null;
  save(access: CalendarAccess): void;
}
