import type { ColumnType } from 'kysely';

/** The cookie that holds a signed-in session. */
export const SESSION_COOKIE = 'bcal_session';
/** The cookie that holds a sealed sign-in challenge while someone is at the provider. */
export const SIGN_IN_COOKIE = 'bcal_sign_in';
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
  owner_id: string | null;
  theme: string;
  locale: string;
  time_zone: string;
  default_open_time: string;
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
}

export interface SubscriptionsTable {
  id: string;
  calendar_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  member_id: string | null;
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
  member_id: string | null;
  text: string;
  created_at: Date;
}

export interface MembersTable {
  id: string;
  calendar_id: string;
  name: string;
  key: string;
  added_at: Date;
}

export interface AccountsTable {
  id: string;
  name: string;
  email: string | null;
  created_at: Date;
}

export interface AccountIdentitiesTable {
  provider: string;
  subject: string;
  account_id: string;
}

export interface MediaFilesTable {
  id: string;
  owner_id: string | null;
  content_type: string;
  /** bigint: node-postgres reads it as a string. */
  bytes: ColumnType<string, number, number>;
  created_at: Date;
}

export interface DoorOpeningsTable {
  door_id: string;
  member_id: string;
  opened_at: Date;
}

export interface Database {
  accounts: AccountsTable;
  account_identities: AccountIdentitiesTable;
  media_files: MediaFilesTable;
  calendars: CalendarsTable;
  doors: DoorsTable;
  door_drafts: DoorDraftsTable;
  calendar_versions: CalendarVersionsTable;
  door_comments: DoorCommentsTable;
  door_openings: DoorOpeningsTable;
  members: MembersTable;
  subscriptions: SubscriptionsTable;
}
