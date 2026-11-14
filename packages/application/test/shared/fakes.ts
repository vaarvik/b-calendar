import { randomUUID } from 'node:crypto';
import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  AdminSession,
  AdminSessionService,
  Calendar,
  CalendarId,
  Clock,
  CommentId,
  CommentNotifier,
  Door,
  DoorComment,
  DoorId,
  IdGenerator,
  Logger,
  MediaId,
  PushEndpoint,
  PushMessage,
  PushOutcome,
  PushSender,
  SecretGenerator,
  SubscriptionId,
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

/** Tokens are `session`; anything else is refused. */
export class PlainSessions implements AdminSessionService {
  public issue(): AdminSession {
    return { token: 'session', expiresAt: T0 };
  }

  public verify(token: string): void {
    if (token !== 'session') {
      throw new UnauthenticatedError();
    }
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
