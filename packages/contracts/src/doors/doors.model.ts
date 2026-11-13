import { z } from 'zod';
import type { CalendarId, DoorId } from '../shared/shared.model.js';
import { InstantSchema, LocalDateSchema, TimeOfDaySchema } from '../shared/shared.model.js';

/** What a link in a door points to, so the app can embed it. */
export const DOOR_LINK_KINDS = ['spotify', 'youtube', 'web'] as const;
export type DoorLinkKind = (typeof DOOR_LINK_KINDS)[number];

export interface DoorLink {
  readonly url: string;
  readonly kind: DoorLinkKind;
  /** A player to embed (Spotify, YouTube); null for plain links. */
  readonly embedUrl: string | null;
}

/** A countdown shown inside a door: "1 hour until we leave". */
export interface DoorCountdown {
  readonly to: Date;
  readonly label: string;
}

/** What the recipient sees behind a door. Every part is optional except the title. */
export interface DoorContent {
  readonly title: string;
  /** Plain text; line breaks are kept. */
  readonly message: string;
  /** Uploaded image (`/media/<file>`) or any https image. */
  readonly imageUrl: string | null;
  /** A song, a video or any web page. */
  readonly linkUrl: string | null;
  readonly countdown: DoorCountdown | null;
  /** Celebrate with confetti when the door opens. */
  readonly confetti: boolean;
}

/** The push notification sent when the door opens. */
export interface DoorNotification {
  readonly title: string;
  readonly body: string;
}

/**
 * One door of a calendar as the recipient has it: the published door. Locked until `opensAt`.
 * Written by PublishCalendar from the draft; her progress (`notifiedAt`, `firstOpenedAt`) stays
 * with the door across versions.
 */
export interface Door {
  readonly id: DoorId;
  readonly calendarId: CalendarId;
  /** 1, 2, 3 …: its place by `opensAt`, set when published. */
  readonly number: number;
  /** The day it opens, `YYYY-MM-DD`, in the calendar's time zone. */
  readonly opensOn: string;
  /** Its own time of day, `HH:MM`; null uses the calendar's default. */
  readonly openTime: string | null;
  /**
   * The instant it opens and its notification goes out: `opensOn` at `openTime` (or the default)
   * in the calendar's time zone. Derived; kept in step by the use cases.
   */
  readonly opensAt: Date;
  /** A special hatch (the birthday, the last day): it looks grander, even while locked. */
  readonly featured: boolean;
  /** A secret door: the recipient does not know it exists until it opens. */
  readonly hidden: boolean;
  readonly content: DoorContent;
  readonly notification: DoorNotification;
  /** When the notification went out (or was skipped as too late); null until then. */
  readonly notifiedAt: Date | null;
  /** When the recipient first looked behind the door; null until then. */
  readonly firstOpenedAt: Date | null;
}

const httpUrl = z.url({ protocol: /^https?$/ }).max(2000);
/** A file on this site (an upload at `/media/…`, an icon), or an absolute http(s) URL. */
const mediaUrl = z.union([
  z
    .string()
    .max(500)
    .regex(/^\/(?!\/)[A-Za-z0-9._/-]+$/),
  httpUrl,
]);

/** What the admin writes into a door. Its number follows from the day and time. */
export interface DoorDraft {
  readonly opensOn: string;
  readonly openTime: string | null;
  readonly featured: boolean;
  /** Not shown to her at all until it opens. */
  readonly hidden: boolean;
  readonly content: DoorContent;
  readonly notification: DoorNotification;
}

export const DoorDraftSchema: z.ZodType<DoorDraft> = z.object({
  opensOn: LocalDateSchema,
  openTime: TimeOfDaySchema.nullable().default(null),
  featured: z.boolean().default(false),
  hidden: z.boolean().default(false),
  content: z.object({
    title: z.string().trim().min(1).max(120),
    message: z.string().max(5000),
    imageUrl: mediaUrl.nullable(),
    linkUrl: httpUrl.nullable(),
    countdown: z
      .object({
        to: z.union([z.date(), InstantSchema]),
        label: z.string().trim().max(120),
      })
      .nullable(),
    confetti: z.boolean(),
  }),
  notification: z.object({
    title: z.string().trim().min(1).max(80),
    body: z.string().trim().max(200),
  }),
});

/**
 * A door the admin is writing. Saved as she types; the recipient never sees it until the calendar
 * is published. Shares its id with the published door it becomes.
 */
export interface DraftDoor extends DoorDraft {
  readonly id: DoorId;
  readonly calendarId: CalendarId;
  /** Orders two doors that open at the same instant. */
  readonly addedAt: Date;
}

/**
 * A door as the admin sees it: the draft, numbered and scheduled, its link classified, with the
 * recipient's progress on the published door of the same id (null when not published).
 */
export interface DoorPreview extends Door {
  readonly link: DoorLink | null;
}

/** The content of an open door as the recipient gets it. */
export interface OpenDoorContent extends Omit<DoorContent, 'linkUrl'> {
  readonly link: DoorLink | null;
}

/**
 * A door as the recipient gets it, like a paper calendar: `locked` until its time, `ready`
 * (still closed, she can open it) after that, and `opened` for good once she has. Only an
 * opened door carries its content; a ready door's content comes from OpenDoor, which records
 * the first look.
 */
export type RecipientDoor =
  | {
      readonly state: 'locked' | 'ready';
      readonly number: number;
      readonly opensAt: Date;
      readonly featured: boolean;
    }
  | {
      readonly state: 'opened';
      readonly number: number;
      readonly opensAt: Date;
      readonly featured: boolean;
      readonly content: OpenDoorContent;
    };
