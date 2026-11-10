import type { Logger, PushOutcome, PushSender } from '@b-calendar/contracts';

/** Push is not configured (no VAPID keys): nothing is sent, and that is logged. */
export class NullPushSender implements PushSender {
  public constructor(private readonly logger: Logger) {}

  public send(): Promise<PushOutcome> {
    this.logger.warn('Push is not configured; set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
    return Promise.resolve('failed');
  }
}
