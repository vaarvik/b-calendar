import { GraceWindowNotificationDecider } from '@b-calendar/domain';
import { T0, TestData, hoursAfter } from '@b-calendar/contracts/test-kit';
import { describe, expect, it } from 'vitest';

describe('GraceWindowNotificationDecider', () => {
  const decider = new GraceWindowNotificationDecider({ graceMinutes: 120 });
  const data = new TestData();
  const calendarId = data.calendarId();

  it('waits until the door opens', () => {
    expect(decider.decide(data.door(calendarId, { opensAt: hoursAfter(T0, 1) }), T0)).toBe('wait');
  });

  it('sends from the moment it opens until the grace window ends', () => {
    const door = data.door(calendarId, { opensAt: T0 });

    expect(decider.decide(door, T0)).toBe('send');
    expect(decider.decide(door, hoursAfter(T0, 2))).toBe('send');
  });

  it('skips a notification that would come too late', () => {
    const door = data.door(calendarId, { opensAt: T0 });

    expect(decider.decide(door, hoursAfter(T0, 2.01))).toBe('skip');
  });

  it('waits forever once notified', () => {
    const door = data.door(calendarId, { opensAt: T0, notifiedAt: T0 });

    expect(decider.decide(door, hoursAfter(T0, 1))).toBe('wait');
  });
});
