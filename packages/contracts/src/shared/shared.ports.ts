import type { z } from 'zod';
import type { CalendarId, DoorId, MediaId, SubscriptionId } from './shared.model.js';

/** The current time. Injected so tests can fix it. */
export interface Clock {
  now(): Date;
}

/** New unique ids. */
export interface IdGenerator {
  calendarId(): CalendarId;
  doorId(): DoorId;
  subscriptionId(): SubscriptionId;
  mediaId(): MediaId;
}

/** Unguessable secrets, e.g. a calendar's access key. */
export interface SecretGenerator {
  /** @returns a URL-safe random string with at least 128 bits of entropy. */
  generate(): string;
}

/** Compares secrets without leaking, through timing, how much of a guess was right. */
export interface SecretMatcher {
  matches(expected: string, actual: string): boolean;
}

export type LogFields = Readonly<Record<string, unknown>>;

/** Structured logging. */
export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

/** Validates input against a schema at a use case boundary. */
export interface InputValidator {
  /**
   * @returns the parsed value.
   * @throws ValidationError listing every issue when `input` does not match.
   */
  validate<T>(schema: z.ZodType<T>, input: unknown): T;
}
