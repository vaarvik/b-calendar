import type {
  Logger,
  PushEndpoint,
  PushMessage,
  PushOutcome,
  PushSender,
} from '@b-calendar/contracts';
import webPush from 'web-push';

export interface WebPushSenderConfig {
  readonly publicKey: string;
  readonly privateKey: string;
  /** `mailto:` or an https URL push services can contact about this sender. */
  readonly subject: string;
  /** How long a push service keeps an undelivered message, in seconds. */
  readonly ttlSeconds: number;
}

/** Web Push with VAPID, through the `web-push` library. */
export class WebPushSender implements PushSender {
  public constructor(
    private readonly config: WebPushSenderConfig,
    private readonly logger: Logger,
  ) {}

  public async send(endpoint: PushEndpoint, message: PushMessage): Promise<PushOutcome> {
    try {
      await webPush.sendNotification(
        { endpoint: endpoint.endpoint, keys: { ...endpoint.keys } },
        JSON.stringify(message),
        {
          TTL: this.config.ttlSeconds,
          urgency: 'high',
          vapidDetails: {
            subject: this.config.subject,
            publicKey: this.config.publicKey,
            privateKey: this.config.privateKey,
          },
        },
      );
      return 'sent';
    } catch (error) {
      const status = error instanceof webPush.WebPushError ? error.statusCode : null;
      if (status === 404 || status === 410) {
        return 'gone';
      }
      this.logger.warn('Web push failed', { status, error: String(error) });
      return 'failed';
    }
  }
}
