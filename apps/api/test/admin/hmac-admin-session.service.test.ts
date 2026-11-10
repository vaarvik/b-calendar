import { UnauthenticatedError } from '@b-calendar/contracts';
import type { Clock } from '@b-calendar/contracts';
import { T0, hoursAfter } from '@b-calendar/contracts/test-kit';
import { ConstantTimeSecretMatcher } from '@b-calendar/domain';
import { describe, expect, it } from 'vitest';
import { HmacAdminSessionService } from '../../src/admin/hmac-admin-session.service.js';

class MovableClock implements Clock {
  public at = T0;
  public now(): Date {
    return this.at;
  }
}

describe('HmacAdminSessionService', () => {
  const clock = new MovableClock();
  const sessions = new HmacAdminSessionService(
    { secret: 's'.repeat(32), ttlHours: 2 },
    clock,
    new ConstantTimeSecretMatcher(),
  );

  it('accepts its own token until it expires', () => {
    clock.at = T0;
    const session = sessions.issue();

    expect(session.expiresAt).toEqual(hoursAfter(T0, 2));
    expect(() => {
      sessions.verify(session.token);
    }).not.toThrow();
    clock.at = hoursAfter(T0, 2);
    expect(() => {
      sessions.verify(session.token);
    }).toThrow(UnauthenticatedError);
  });

  it.each(['', 'abc', '1.2.3', 'x.y', '99999999999999.forged'])('refuses %s', (token) => {
    clock.at = T0;
    expect(() => {
      sessions.verify(token);
    }).toThrow(UnauthenticatedError);
  });

  it('refuses a token signed with another secret', () => {
    clock.at = T0;
    const other = new HmacAdminSessionService(
      { secret: 'o'.repeat(32), ttlHours: 2 },
      clock,
      new ConstantTimeSecretMatcher(),
    );

    expect(() => {
      sessions.verify(other.issue().token);
    }).toThrow(UnauthenticatedError);
  });
});
