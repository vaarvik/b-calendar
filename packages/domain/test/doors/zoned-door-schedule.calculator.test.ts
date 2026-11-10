import { ZonedDoorScheduleCalculator } from '@b-calendar/domain';
import { describe, expect, it } from 'vitest';

describe('ZonedDoorScheduleCalculator', () => {
  const calculator = new ZonedDoorScheduleCalculator();

  it.each([
    // Winter time in Oslo: UTC+1.
    ['2026-11-15', '08:00', 'Europe/Oslo', '2026-11-15T07:00:00.000Z'],
    // Summer time in Oslo: UTC+2.
    ['2026-07-01', '08:00', 'Europe/Oslo', '2026-07-01T06:00:00.000Z'],
    // Around midnight the date in UTC differs.
    ['2026-12-24', '00:30', 'Europe/Oslo', '2026-12-23T23:30:00.000Z'],
    ['2026-12-24', '23:45', 'Europe/Oslo', '2026-12-24T22:45:00.000Z'],
    ['2026-12-24', '17:00', 'UTC', '2026-12-24T17:00:00.000Z'],
    ['2026-12-24', '09:00', 'America/New_York', '2026-12-24T14:00:00.000Z'],
    // The day clocks go back (03:00 → 02:00): 08:00 is already UTC+1.
    ['2026-10-25', '08:00', 'Europe/Oslo', '2026-10-25T07:00:00.000Z'],
    // The day clocks go forward (02:00 → 03:00): 08:00 is already UTC+2.
    ['2026-03-29', '08:00', 'Europe/Oslo', '2026-03-29T06:00:00.000Z'],
  ])('%s at %s in %s is %s', (day, time, zone, expected) => {
    expect(calculator.opensAt(day, time, zone).toISOString()).toBe(expected);
  });

  it('moves a time skipped by daylight saving to the hour after', () => {
    // 02:30 does not exist in Oslo on 2026-03-29; 03:30 summer time does.
    expect(calculator.opensAt('2026-03-29', '02:30', 'Europe/Oslo').toISOString()).toBe(
      '2026-03-29T01:30:00.000Z',
    );
  });
});
