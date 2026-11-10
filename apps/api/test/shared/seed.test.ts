import { DoorDraftSchema, CalendarSettingsSchema } from '@b-calendar/contracts';
import { describe, expect, it } from 'vitest';
import { BIRTHDAY_WEEK } from '../../src/api.model.js';

describe('BIRTHDAY_WEEK', () => {
  it('is a valid calendar with numbered doors in time order', () => {
    expect(CalendarSettingsSchema.safeParse(BIRTHDAY_WEEK.settings).success).toBe(true);
    for (const draft of BIRTHDAY_WEEK.doors) {
      expect(DoorDraftSchema.safeParse(draft).success).toBe(true);
    }
    const times = BIRTHDAY_WEEK.doors.map((door) => door.opensAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(BIRTHDAY_WEEK.doors[0]?.opensAt.toISOString()).toBe('2026-11-15T08:00:00.000Z');
  });
});
