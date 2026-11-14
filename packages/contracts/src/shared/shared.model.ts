import { z } from 'zod';

declare const brand: unique symbol;

/**
 * A nominal type: `T` tagged with `B` so values of different ID kinds cannot be mixed.
 * The tag exists only at compile time; at runtime a branded ID is a plain `T`.
 */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** A calendar: a series of doors for one recipient. UUID. */
export type CalendarId = Brand<string, 'CalendarId'>;
/** One door (hatch, luke) in a calendar. UUID. */
export type DoorId = Brand<string, 'DoorId'>;
/** One browser's push subscription. UUID. */
export type SubscriptionId = Brand<string, 'SubscriptionId'>;
/** One uploaded media file. UUID. */
export type MediaId = Brand<string, 'MediaId'>;
/** Identifies a comment on a door. */
export type CommentId = Brand<string, 'CommentId'>;

export const CalendarIdSchema: z.ZodType<CalendarId> = z
  .uuid()
  .transform((value) => value as CalendarId);
export const DoorIdSchema: z.ZodType<DoorId> = z.uuid().transform((value) => value as DoorId);
export const SubscriptionIdSchema: z.ZodType<SubscriptionId> = z
  .uuid()
  .transform((value) => value as SubscriptionId);
export const MediaIdSchema: z.ZodType<MediaId> = z.uuid().transform((value) => value as MediaId);
export const CommentIdSchema: z.ZodType<CommentId> = z
  .uuid()
  .transform((value) => value as CommentId);

/** A point in time on the wire: ISO 8601 with an offset, parsed to a Date. */
export const InstantSchema: z.ZodType<Date, string> = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

/** A wall-clock time of day, `HH:MM`, 24 h. */
export const TimeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM, 24 h');

/** A calendar date, `YYYY-MM-DD`. */
export const LocalDateSchema = z.iso.date();

/** An IANA time zone the runtime knows, e.g. `Europe/Oslo`. */
export const TimeZoneSchema = z.string().refine((zone) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}, 'an IANA time zone, e.g. Europe/Oslo');

/** The error body of every failed HTTP request. */
export interface ErrorResponseDto {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly issues?: readonly {
      readonly path: readonly (string | number)[];
      readonly message: string;
    }[];
  };
}
