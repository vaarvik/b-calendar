import { z } from 'zod';
import { CALENDAR_LOCALES, CALENDAR_THEMES, CALENDAR_VIEWER_KINDS } from './calendars.model.js';
import type { CalendarLocale, CalendarTheme, CalendarViewerKind } from './calendars.model.js';
import { MemberDtoSchema } from '../members/members.dtos.js';
import type { MemberDto } from '../members/members.dtos.js';
import { DoorPreviewDtoSchema, RecipientDoorDtoSchema } from '../doors/doors.dtos.js';
import type { DoorPreviewDto, RecipientDoorDto } from '../doors/doors.dtos.js';

export interface CalendarDto {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly theme: CalendarTheme;
  readonly locale: CalendarLocale;
  readonly timeZone: string;
  readonly defaultOpenTime: string;
  readonly followerKey: string;
  readonly createdAt: string;
}

export const CalendarDtoSchema: z.ZodType<CalendarDto> = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  theme: z.enum(CALENDAR_THEMES),
  locale: z.enum(CALENDAR_LOCALES),
  timeZone: z.string(),
  defaultOpenTime: z.string(),
  followerKey: z.string(),
  createdAt: z.string(),
});

export interface CalendarListResponseDto {
  readonly calendars: readonly CalendarDto[];
}

export const CalendarListResponseDtoSchema: z.ZodType<CalendarListResponseDto> = z.object({
  calendars: z.array(CalendarDtoSchema),
});

export interface CalendarVersionDto {
  readonly version: number;
  readonly publishedAt: string;
  readonly doorCount: number;
}

export const CalendarVersionDtoSchema: z.ZodType<CalendarVersionDto> = z.object({
  version: z.int().positive(),
  publishedAt: z.string(),
  doorCount: z.int().nonnegative(),
});

export interface CalendarDetailsResponseDto {
  readonly calendar: CalendarDto;
  readonly doors: readonly DoorPreviewDto[];
  readonly members: readonly MemberDto[];
  readonly unpublishedChanges: boolean;
  readonly versions: readonly CalendarVersionDto[];
  readonly subscriberCount: number;
}

export const CalendarDetailsResponseDtoSchema: z.ZodType<CalendarDetailsResponseDto> = z.object({
  calendar: CalendarDtoSchema,
  doors: z.array(DoorPreviewDtoSchema),
  members: z.array(MemberDtoSchema),
  unpublishedChanges: z.boolean(),
  versions: z.array(CalendarVersionDtoSchema),
  subscriberCount: z.int().nonnegative(),
});

export interface RecipientCalendarResponseDto {
  readonly viewer: CalendarViewerKind;
  readonly name: string | null;
  /**
   * The same, as app versions from before members read it: a Home Screen app resumed without
   * reloading still runs the old bundle. Remove in December 2026.
   */
  readonly role: 'recipient' | 'follower';
  readonly recipientName: string;
  readonly slug: string;
  readonly title: string;
  readonly theme: CalendarTheme;
  readonly locale: CalendarLocale;
  readonly now: string;
  readonly doors: readonly RecipientDoorDto[];
}

export const RecipientCalendarResponseDtoSchema: z.ZodType<RecipientCalendarResponseDto> = z.object(
  {
    viewer: z.enum(CALENDAR_VIEWER_KINDS),
    name: z.string().nullable(),
    role: z.enum(['recipient', 'follower']),
    recipientName: z.string(),
    slug: z.string(),
    title: z.string(),
    theme: z.enum(CALENDAR_THEMES),
    locale: z.enum(CALENDAR_LOCALES),
    now: z.string(),
    doors: z.array(RecipientDoorDtoSchema),
  },
);
