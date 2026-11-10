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
  access_key: string;
  created_at: Date;
}

export interface DoorsTable {
  id: string;
  calendar_id: string;
  number: number;
  opens_at: Date;
  title: string;
  message: string;
  image_url: string | null;
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

export interface Database {
  calendars: CalendarsTable;
  doors: DoorsTable;
  subscriptions: SubscriptionsTable;
}
