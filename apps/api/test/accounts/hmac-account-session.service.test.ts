import { UnauthenticatedError } from '@b-calendar/contracts';
import type { AccountId } from '@b-calendar/contracts';
import { ConstantTimeSecretMatcher } from '@b-calendar/domain';
import { describe, expect, it } from 'vitest';
import { HmacAccountSessionService } from '../../src/accounts/hmac-account-session.service.js';
import { HmacSignInChallengeSealer } from '../../src/accounts/hmac-sign-in-challenge.sealer.js';

const T0 = new Date('2026-11-15T07:00:00.000Z');
const ACCOUNT = '11111111-1111-4111-8111-111111111111' as AccountId;

function clockAt(now: Date) {
  return { now: () => now };
}

describe('HmacAccountSessionService', () => {
  const matcher = new ConstantTimeSecretMatcher();
  const sessions = new HmacAccountSessionService(
    { secret: 's'.repeat(32), ttlHours: 1 },
    clockAt(T0),
    matcher,
  );

  it('gives back the account, or null for the password, until the session expires', () => {
    const forAccount = sessions.issue(ACCOUNT);
    const forPassword = sessions.issue(null);

    expect(forAccount.expiresAt).toEqual(new Date('2026-11-15T08:00:00.000Z'));
    expect(sessions.verify(forAccount.token)).toBe(ACCOUNT);
    expect(sessions.verify(forPassword.token)).toBeNull();
    const later = new HmacAccountSessionService(
      { secret: 's'.repeat(32), ttlHours: 1 },
      clockAt(new Date('2026-11-15T08:00:00.000Z')),
      matcher,
    );
    expect(() => later.verify(forAccount.token)).toThrow(UnauthenticatedError);
  });

  it('refuses a token for another account, another secret, or a malformed one', () => {
    const { token } = sessions.issue(ACCOUNT);
    const [, expiry, signature] = token.split('.');
    const other = new HmacAccountSessionService(
      { secret: 't'.repeat(32), ttlHours: 1 },
      clockAt(T0),
      matcher,
    );

    for (const forged of [
      `22222222-2222-4222-8222-222222222222.${String(expiry)}.${String(signature)}`,
      `-.${String(expiry)}.${String(signature)}`,
      other.issue(ACCOUNT).token,
      'nonsense',
      `${token}.extra`,
      `not-a-uuid.${String(expiry)}.${String(signature)}`,
    ]) {
      expect(() => sessions.verify(forged)).toThrow(UnauthenticatedError);
    }
  });
});

describe('HmacSignInChallengeSealer', () => {
  const matcher = new ConstantTimeSecretMatcher();
  const sealer = new HmacSignInChallengeSealer({ secret: 's'.repeat(32) }, clockAt(T0), matcher);
  const challenge = {
    provider: 'google' as const,
    state: 'state',
    nonce: 'nonce',
    codeVerifier: 'v'.repeat(48),
    returnTo: '/admin/x',
    expiresAt: new Date('2026-11-15T07:10:00.000Z'),
  };

  it('opens what it sealed', () => {
    expect(sealer.open(sealer.seal(challenge))).toEqual(challenge);
  });

  it('refuses a changed, foreign, malformed or expired seal', () => {
    const sealed = sealer.seal(challenge);
    const [payload, signature] = sealed.split('.');
    const changed = Buffer.from(
      JSON.stringify({
        ...challenge,
        returnTo: '/admin/y',
        expiresAt: challenge.expiresAt.getTime(),
      }),
    ).toString('base64url');
    const foreign = new HmacSignInChallengeSealer({ secret: 't'.repeat(32) }, clockAt(T0), matcher);
    const late = new HmacSignInChallengeSealer(
      { secret: 's'.repeat(32) },
      clockAt(challenge.expiresAt),
      matcher,
    );
    const garbage = 'not json';
    const signedGarbage = new HmacSignInChallengeSealer(
      { secret: 's'.repeat(32) },
      clockAt(T0),
      matcher,
    );

    for (const attempt of [
      () => sealer.open(`${changed}.${String(signature)}`),
      () => sealer.open(foreign.seal(challenge)),
      () => sealer.open(String(payload)),
      () => late.open(sealed),
      () => sealer.open(garbage),
      () => signedGarbage.open(`${Buffer.from('x').toString('base64url')}.${String(signature)}`),
    ]) {
      expect(attempt).toThrow(UnauthenticatedError);
    }
  });
});
