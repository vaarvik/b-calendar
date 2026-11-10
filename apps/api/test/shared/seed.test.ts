import { DoorDraftSchema, CalendarSettingsSchema } from '@b-calendar/contracts';
import { describe, expect, it } from 'vitest';
import { BIRTHDAY_WEEK } from '../../src/api.model.js';

describe('BIRTHDAY_WEEK', () => {
  it('is a valid calendar with numbered doors in time order', () => {
    expect(CalendarSettingsSchema.safeParse(BIRTHDAY_WEEK.settings).success).toBe(true);
    for (const draft of BIRTHDAY_WEEK.doors) {
      expect(DoorDraftSchema.safeParse(draft).success).toBe(true);
    }
    const days = BIRTHDAY_WEEK.doors.map((door) => door.opensOn);
    expect(days).toEqual(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19']);
    expect(BIRTHDAY_WEEK.settings.defaultOpenTime).toBe('08:00');
  });
});
