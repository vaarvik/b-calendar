import { randomUUID } from 'node:crypto';
import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  AccountId,
  AccountSession,
  AccountSessionService,
  Calendar,
  CalendarId,
  Clock,
  CommentId,
  CommentNotifier,
  Door,
  DoorComment,
  DoorId,
  IdGenerator,
  IdentityProvider,
  IdentityProviderName,
  Logger,
  MediaId,
  MemberId,
  PushEndpoint,
  PushMessage,
  PushOutcome,
  PushSender,
  SecretGenerator,
  SignInChallenge,
  SignInChallengeSealer,
  SubscriptionId,
  VerifiedIdentity,
} from '@b-calendar/contracts';
import { T0 } from '@b-calendar/contracts/test-kit';

/** A clock tests move by hand. */
export class ManualClock implements Clock {
  public constructor(private current: Date = T0) {}

  public now(): Date {
    return this.current;
  }

  public set(at: Date): void {
    this.current = at;
  }
}

export class RandomIds implements IdGenerator {
  public calendarId(): CalendarId {
    return randomUUID() as CalendarId;
  }
  public doorId(): DoorId {
    return randomUUID() as DoorId;
  }
  public subscriptionId(): SubscriptionId {
    return randomUUID() as SubscriptionId;
  }
  public mediaId(): MediaId {
    return randomUUID() as MediaId;
  }
  public commentId(): CommentId {
    return randomUUID() as CommentId;
  }
  public memberId(): MemberId {
    return randomUUID() as MemberId;
  }
  public accountId(): AccountId {
    return randomUUID() as AccountId;
  }
}

/** `secret-1`, `secret-2`, … */
export class CountingSecrets implements SecretGenerator {
  private count = 0;

  public generate(): string {
    this.count += 1;
    return `secret-${String(this.count)}`;
  }
}

/** Records pushes and answers with a fixed outcome per endpoint (default `sent`). */
export class RecordingPushSender implements PushSender {
  public readonly sent: { endpoint: string; message: PushMessage }[] = [];

  public constructor(private readonly outcomes: Readonly<Record<string, PushOutcome>> = {}) {}

  public send(endpoint: PushEndpoint, message: PushMessage): Promise<PushOutcome> {
    this.sent.push({ endpoint: endpoint.endpoint, message });
    return Promise.resolve(this.outcomes[endpoint.endpoint] ?? 'sent');
  }
}

/** Tokens are `session:<account id>`; anything else is refused. */
export class PlainSessions implements AccountSessionService {
  public issue(owner: AccountId): AccountSession {
    return { token: `session:${owner}`, expiresAt: T0 };
  }

  public verify(token: string): AccountId {
    const match = /^session:(.+)$/.exec(token);
    if (match?.[1] === undefined) {
      throw new UnauthenticatedError();
    }
    return match[1] as AccountId;
  }
}

export class SilentLogger implements Logger {
  public readonly warnings: string[] = [];
  public debug(): void {
    // Silent on purpose.
  }
  public info(): void {
    // Silent on purpose.
  }
  public warn(message: string): void {
    this.warnings.push(message);
  }
  public error(message: string): void {
    this.warnings.push(message);
  }
}

/** Records which comments were announced, and to whom not. */
export class RecordingCommentNotifier implements CommentNotifier {
  public readonly notified: { comment: DoorComment; except: string | null }[] = [];

  public notify(
    _calendar: Calendar,
    _door: Door,
    comment: DoorComment,
    except: string | null,
  ): Promise<void> {
    this.notified.push({ comment, except });
    return Promise.resolve();
  }
}

/** Limits small enough to reach in a test. */
export const TEST_LIMITS = { calendars: 2, mediaBytes: 10, membersPerCalendar: 2 } as const;

/** Hands out whatever identity a test sets for a code; anything else is refused. */
export class FakeIdentityProvider implements IdentityProvider {
  public readonly identities = new Map<string, Omit<VerifiedIdentity, 'provider'>>();
  public readonly asked: { challenge: SignInChallenge; redirectUri: string }[] = [];

  public constructor(public readonly name: IdentityProviderName = 'google') {}

  public authorizationUrl(challenge: SignInChallenge, redirectUri: string): Promise<string> {
    this.asked.push({ challenge, redirectUri });
    return Promise.resolve(`https://${this.name}.example/auth?state=${challenge.state}`);
  }

  public verify(code: string, challenge: SignInChallenge): Promise<VerifiedIdentity> {
    const identity = this.identities.get(`${code}:${challenge.nonce}`) ?? this.identities.get(code);
    return identity === undefined
      ? Promise.reject(new UnauthenticatedError('Bad code.'))
      : Promise.resolve({ ...identity, provider: this.name });
  }
}

/** Seals as JSON; refuses anything not sealed here, or past its time by the given clock. */
export class JsonChallengeSealer implements SignInChallengeSealer {
  public constructor(private readonly clock: Clock) {}

  public seal(challenge: SignInChallenge): string {
    return `sealed:${JSON.stringify(challenge)}`;
  }

  public open(sealed: string): SignInChallenge {
    if (!sealed.startsWith('sealed:')) {
      throw new UnauthenticatedError('Not sealed here.');
    }
    const raw = JSON.parse(sealed.slice('sealed:'.length)) as SignInChallenge & {
      expiresAt: string;
    };
    const challenge = { ...raw, expiresAt: new Date(raw.expiresAt) };
    if (challenge.expiresAt.getTime() <= this.clock.now().getTime()) {
      throw new UnauthenticatedError('Too late.');
    }
    return challenge;
  }
}
