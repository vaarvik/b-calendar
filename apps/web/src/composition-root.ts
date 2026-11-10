import { CanvasImageResizer } from './admin/canvas-image.resizer';
import { HttpAdminClient } from './admin/http-admin.client';
import type { AdminClient, ImageResizer } from './admin/admin.ports';
import { HttpCalendarClient } from './calendars/http-calendar.client';
import { KeyValueAccessKeyStorage } from './calendars/key-value-access-key.storage';
import type { AccessKeyStorage, CalendarClient } from './calendars/calendars.ports';
import { BrowserPushSubscriber } from './notifications/browser-push.subscriber';
import type { PushSubscriber } from './notifications/notifications.ports';
import { FetchJsonHttpClient } from './shared/fetch-json-http.client';
import { LocalKeyValueStorage } from './shared/local-key-value.storage';

export interface Services {
  readonly calendars: CalendarClient;
  readonly keys: AccessKeyStorage;
  readonly push: PushSubscriber;
  readonly admin: AdminClient;
  readonly images: ImageResizer;
}

/** The only place in the web app that constructs services. */
export class CompositionRoot implements Services {
  public readonly calendars: CalendarClient;
  public readonly keys: AccessKeyStorage;
  public readonly push: PushSubscriber;
  public readonly admin: AdminClient;
  public readonly images: ImageResizer;

  public constructor() {
    const http = new FetchJsonHttpClient(globalThis.fetch.bind(globalThis));
    const storage = new LocalKeyValueStorage('b-calendar:');
    this.calendars = new HttpCalendarClient(http);
    this.keys = new KeyValueAccessKeyStorage(storage);
    this.push = new BrowserPushSubscriber('/sw.js');
    this.admin = new HttpAdminClient(http, storage);
    this.images = new CanvasImageResizer();
  }
}
