import type {
  CalendarDetailsResponseDto,
  CalendarDto,
  CalendarSettings,
  DoorPreviewDto,
  SendTestNotificationResponseDto,
} from '@b-calendar/contracts';

/** A door as the admin's form sends it: times as ISO strings. */
export interface DoorDraftDto {
  readonly number: number;
  readonly opensAt: string;
  readonly featured: boolean;
  readonly content: {
    readonly title: string;
    readonly message: string;
    readonly imageUrl: string | null;
    readonly linkUrl: string | null;
    readonly countdown: { readonly to: string; readonly label: string } | null;
    readonly confetti: boolean;
  };
  readonly notification: { readonly title: string; readonly body: string };
}

/** The admin's side of the API. Every call but logIn needs a session. */
export interface AdminClient {
  /** @returns whether a session is stored (it may still have expired). */
  signedIn(): boolean;
  logIn(password: string): Promise<void>;
  logOut(): void;
  listCalendars(): Promise<readonly CalendarDto[]>;
  createCalendar(settings: CalendarSettings): Promise<CalendarDto>;
  updateCalendar(calendarId: string, settings: CalendarSettings): Promise<CalendarDto>;
  rotateKey(calendarId: string): Promise<CalendarDto>;
  calendar(calendarId: string): Promise<CalendarDetailsResponseDto>;
  addDoor(calendarId: string, draft: DoorDraftDto): Promise<DoorPreviewDto>;
  editDoor(doorId: string, draft: DoorDraftDto): Promise<DoorPreviewDto>;
  removeDoor(doorId: string): Promise<void>;
  sendTestNotification(calendarId: string): Promise<SendTestNotificationResponseDto>;
  /** @returns the uploaded image's URL. */
  uploadImage(image: Blob): Promise<string>;
}

/** Shrinks phone photos before upload and turns HEIC into JPEG. */
export interface ImageResizer {
  resize(file: Blob, maxSide: number): Promise<Blob>;
}
