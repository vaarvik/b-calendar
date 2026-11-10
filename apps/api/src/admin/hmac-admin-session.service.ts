import { createHmac } from 'node:crypto';
import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  AdminSession,
  AdminSessionService,
  Clock,
  SecretMatcher,
} from '@b-calendar/contracts';

export interface HmacAdminSessionServiceConfig {
  readonly secret: string;
  readonly ttlHours: number;
}

/** `<expiry ms>.<HMAC-SHA256 of it>`, base64url. Stateless. */
export class HmacAdminSessionService implements AdminSessionService {
  public constructor(
    private readonly config: HmacAdminSessionServiceConfig,
    private readonly clock: Clock,
    private readonly matcher: SecretMatcher,
  ) {}

  public issue(): AdminSession {
    const expiresAt = new Date(this.clock.now().getTime() + this.config.ttlHours * 3_600_000);
    const payload = String(expiresAt.getTime());
    return { token: `${payload}.${this.sign(payload)}`, expiresAt };
  }

  public verify(token: string): void {
    const [payload, signature, ...rest] = token.split('.');
    if (
      payload === undefined ||
      signature === undefined ||
      rest.length > 0 ||
      !/^\d+$/.test(payload) ||
      !this.matcher.matches(this.sign(payload), signature) ||
      Number(payload) <= this.clock.now().getTime()
    ) {
      throw new UnauthenticatedError('Sign in again.');
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.config.secret).update(`admin:${payload}`).digest('base64url');
  }
}
