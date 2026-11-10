import { ConstantTimeSecretMatcher } from '@b-calendar/domain';
import { describe, expect, it } from 'vitest';

describe('ConstantTimeSecretMatcher', () => {
  const matcher = new ConstantTimeSecretMatcher();

  it('matches equal secrets', () => {
    expect(matcher.matches('s3cret-key', 's3cret-key')).toBe(true);
  });

  it.each([
    ['s3cret-key', 's3cret-kez'],
    ['s3cret-key', 's3cret-ke'],
    ['s3cret-key', ''],
    ['', 'x'],
    ['æøå', 'aoa'],
  ])('refuses %s against %s', (expected, actual) => {
    expect(matcher.matches(expected, actual)).toBe(false);
  });

  it('matches non-ASCII secrets by code unit', () => {
    expect(matcher.matches('æøå', 'æøå')).toBe(true);
  });
});
