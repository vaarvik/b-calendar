import type {
  AddDoorCommentRequestDto,
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

/** A door as the admin's form sends it: times as ISO strings. Its number follows from the date. */
export interface DoorDraftDto {
  /** `YYYY-MM-DD` in the calendar's time zone. */
  readonly opensOn: string;
  /** `HH:MM`; null uses the calendar's default time. */
  readonly openTime: string | null;
  readonly featured: boolean;
  /** Not shown to her until it opens. */
  readonly hidden: boolean;
  readonly content: {
    readonly title: string;
    readonly message: string;
    readonly imageUrl: string | null;
    readonly secondImageUrl: string | null;
    readonly videoUrl: string | null;
    readonly audioUrl: string | null;
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
  /** A new key for the follower link; the members' links keep working. */
  rotateFollowerKey(calendarId: string): Promise<CalendarDto>;
  /** A person sharing the calendar, with their own link. */
  addMember(calendarId: string, name: string): Promise<MemberDto>;
  renameMember(memberId: string, name: string): Promise<MemberDto>;
  /** A new key for one member's link; their old link stops working. */
  rotateMemberKey(memberId: string): Promise<MemberDto>;
  removeMember(memberId: string): Promise<void>;
  calendar(calendarId: string): Promise<CalendarDetailsResponseDto>;
  addDoor(calendarId: string, draft: DoorDraftDto): Promise<DoorPreviewDto>;
  editDoor(doorId: string, draft: DoorDraftDto): Promise<DoorPreviewDto>;
  removeDoor(doorId: string): Promise<void>;
  /** A published door's comments, oldest first. */
  doorComments(doorId: string): Promise<readonly DoorCommentDto[]>;
  removeComment(commentId: string): Promise<void>;
  /** The giver's comment behind a published door, also one that has not opened. */
  addComment(doorId: string, comment: AddDoorCommentRequestDto): Promise<DoorCommentDto>;
  /** Gives the members the draft as the calendar's next version. */
  publish(calendarId: string): Promise<CalendarVersionDto>;
  sendTestNotification(calendarId: string): Promise<SendTestNotificationResponseDto>;
  /** Uploads a photo, song or video; its type is the blob's type. */
  uploadMedia(file: Blob): Promise<UploadMediaResponseDto>;
}

/** Shrinks phone photos before upload and turns HEIC into JPEG. */
export interface ImageResizer {
  resize(file: Blob, maxSide: number): Promise<Blob>;
}
