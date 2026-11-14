import type { ColumnType } from 'kysely';
/** What an error becomes on the wire. `unexpected` errors are logged; their details are hidden. */
export interface HttpErrorResponse {
  readonly statusCode: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly unexpected: boolean;
}

export interface CalendarsTable {
  id: string;
  slug: string;
  title: string;
  recipient_name: string;
  theme: string;
  locale: string;
  time_zone: string;
  default_open_time: string;
  access_key: string;
  follower_key: string;
  created_at: Date;
}

export interface DoorsTable {
  id: string;
  calendar_id: string;
  number: number;
  opens_on: string;
  open_time: string | null;
  opens_at: Date;
  featured: boolean;
  hidden: boolean;
  title: string;
  message: string;
  image_url: string | null;
  second_image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  link_url: string | null;
  countdown_to: Date | null;
  countdown_label: string | null;
  confetti: boolean;
  notification_title: string;
  notification_body: string;
  notified_at: Date | null;
  first_opened_at: Date | null;
}

export interface SubscriptionsTable {
  id: string;
  calendar_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: Date;
}

/** jsonb: read as parsed JSON, written as JSON text (node-postgres would turn arrays into Postgres arrays). */
export type JsonColumn = ColumnType<unknown, string, string>;

export interface DoorDraftsTable {
  id: string;
  calendar_id: string;
  opens_on: string;
  added_at: Date;
  /** The DoorDraft. */
  draft: JsonColumn;
}

export interface CalendarVersionsTable {
  calendar_id: string;
  version: number;
  published_at: Date;
  /** The PublishedDoor list, by number. */
  doors: JsonColumn;
}

export interface DoorCommentsTable {
  id: string;
  door_id: string;
  author: string;
  role: string;
  text: string;
  created_at: Date;
}

export interface Database {
  calendars: CalendarsTable;
  doors: DoorsTable;
  door_drafts: DoorDraftsTable;
  calendar_versions: CalendarVersionsTable;
  door_comments: DoorCommentsTable;
  subscriptions: SubscriptionsTable;
}
