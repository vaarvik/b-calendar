import { z } from 'zod';
import type { CalendarId } from '../shared/shared.model.js';
import { TimeOfDaySchema, TimeZoneSchema } from '../shared/shared.model.js';

/** Look and feel of a calendar. */
export const CALENDAR_THEMES = ['birthday', 'christmas'] as const;
export type CalendarTheme = (typeof CALENDAR_THEMES)[number];

/** Language of the recipient's fixed UI copy. Door content is written by hand in any language. */
export const CALENDAR_LOCALES = ['nb', 'en'] as const;
export type CalendarLocale = (typeof CALENDAR_LOCALES)[number];

/** Lowercase letters, digits and dashes; the calendar's address, `/c/<slug>`. */
export const SlugSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase letters, digits and single dashes');

/** What the admin chooses about a calendar. */
export interface CalendarSettings {
  readonly slug: string;
  readonly title: string;
  /** Shown in greetings: "Hei, Ida". */
  readonly recipientName: string;
  readonly theme: CalendarTheme;
  readonly locale: CalendarLocale;
  /** Where the doors' times of day are meant, e.g. `Europe/Oslo`. */
  readonly timeZone: string;
  /** When a door opens, and its notification goes out, unless the door sets its own time. `HH:MM`. */
  readonly defaultOpenTime: string;
}

export const CalendarSettingsSchema: z.ZodType<CalendarSettings> = z.object({
  slug: SlugSchema,
  title: z.string().trim().min(1).max(80),
  recipientName: z.string().trim().min(1).max(40),
  theme: z.enum(CALENDAR_THEMES),
  locale: z.enum(CALENDAR_LOCALES),
  timeZone: TimeZoneSchema,
  defaultOpenTime: TimeOfDaySchema,
});

/** A series of doors for one recipient. Aggregate root; doors refer to it by id. */
export interface Calendar extends CalendarSettings {
  readonly id: CalendarId;
  /** The recipient's secret. Part of her link; whoever has it can open the calendar. */
  readonly accessKey: string;
  readonly createdAt: Date;
}

/** Proof of access a recipient sends: the calendar's address and its key. */
export interface CalendarAccess {
  readonly slug: string;
  readonly accessKey: string;
}

export const CalendarAccessSchema: z.ZodType<CalendarAccess> = z.object({
  slug: SlugSchema,
  accessKey: z.string().min(1).max(200),
});
