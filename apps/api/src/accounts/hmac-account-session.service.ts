import { createHmac } from 'node:crypto';
import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  AccountId,
  AccountSession,
  AccountSessionService,
  CalendarOwnerId,
  Clock,
  SecretMatcher,
} from '@b-calendar/contracts';

export interface HmacAccountSessionServiceConfig {
  readonly secret: string;
  readonly ttlHours: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** `<account id, or - for the password>.<expiry ms>.<HMAC-SHA256 of both>`. Stateless. */
export class HmacAccountSessionService implements AccountSessionService {
  public constructor(
    private readonly config: HmacAccountSessionServiceConfig,
    private readonly clock: Clock,
    private readonly matcher: SecretMatcher,
  ) {}

  public issue(owner: CalendarOwnerId): AccountSession {
    const expiresAt = new Date(this.clock.now().getTime() + this.config.ttlHours * 3_600_000);
    const payload = `${owner ?? '-'}.${String(expiresAt.getTime())}`;
    return { token: `${payload}.${this.sign(payload)}`, expiresAt };
  }

  public verify(token: string): CalendarOwnerId {
    const [owner, expiry, signature, ...rest] = token.split('.');
    if (
      owner === undefined ||
      expiry === undefined ||
      signature === undefined ||
      rest.length > 0 ||
      (owner !== '-' && !UUID.test(owner)) ||
      !/^\d+$/.test(expiry) ||
      !this.matcher.matches(this.sign(`${owner}.${expiry}`), signature) ||
      Number(expiry) <= this.clock.now().getTime()
    ) {
      throw new UnauthenticatedError('Sign in again.');
    }
    return owner === '-' ? null : (owner as AccountId);
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.config.secret)
      .update(`session:${payload}`)
      .digest('base64url');
  }
}
