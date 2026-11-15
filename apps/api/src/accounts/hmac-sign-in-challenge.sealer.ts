import { createHmac } from 'node:crypto';
import { IDENTITY_PROVIDERS, UnauthenticatedError } from '@b-calendar/contracts';
import type {
  Clock,
  SecretMatcher,
  SignInChallenge,
  SignInChallengeSealer,
} from '@b-calendar/contracts';
import { z } from 'zod';

export interface HmacSignInChallengeSealerConfig {
  readonly secret: string;
}

const ChallengeSchema = z.object({
  provider: z.enum(IDENTITY_PROVIDERS),
  state: z.string().min(1),
  nonce: z.string().min(1),
  codeVerifier: z.string().min(43).max(128),
  returnTo: z.string(),
  expiresAt: z.number().int(),
});

/**
 * `<base64url JSON>.<HMAC-SHA256>`. Signed, not encrypted: it only ever travels to the browser that
 * started the sign-in, in an HttpOnly cookie.
 */
export class HmacSignInChallengeSealer implements SignInChallengeSealer {
  public constructor(
    private readonly config: HmacSignInChallengeSealerConfig,
    private readonly clock: Clock,
    private readonly matcher: SecretMatcher,
  ) {}

  public seal(challenge: SignInChallenge): string {
    const payload = Buffer.from(
      JSON.stringify({ ...challenge, expiresAt: challenge.expiresAt.getTime() }),
    ).toString('base64url');
    return `${payload}.${this.sign(payload)}`;
  }

  public open(sealed: string): SignInChallenge {
    const [payload, signature, ...rest] = sealed.split('.');
    if (
      payload === undefined ||
      signature === undefined ||
      rest.length > 0 ||
      !this.matcher.matches(this.sign(payload), signature)
    ) {
      throw new UnauthenticatedError('The sign-in cookie does not hold.');
    }
    const parsed = ChallengeSchema.safeParse(this.json(payload));
    if (!parsed.success || parsed.data.expiresAt <= this.clock.now().getTime()) {
      throw new UnauthenticatedError('The sign-in took too long. Try again.');
    }
    return { ...parsed.data, expiresAt: new Date(parsed.data.expiresAt) };
  }

  private json(payload: string): unknown {
    try {
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.config.secret)
      .update(`sign-in:${payload}`)
      .digest('base64url');
  }
}
