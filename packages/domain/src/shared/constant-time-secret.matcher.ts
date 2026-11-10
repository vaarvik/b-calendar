import type { SecretMatcher } from '@b-calendar/contracts';

/** Compares every code unit of the longer string, whatever the first difference. */
export class ConstantTimeSecretMatcher implements SecretMatcher {
  public matches(expected: string, actual: string): boolean {
    const length = Math.max(expected.length, actual.length);
    let difference = expected.length ^ actual.length;
    for (let index = 0; index < length; index += 1) {
      difference |= (expected.charCodeAt(index) || 0) ^ (actual.charCodeAt(index) || 0);
    }
    return difference === 0;
  }
}
