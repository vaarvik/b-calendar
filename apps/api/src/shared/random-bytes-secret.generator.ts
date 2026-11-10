import { randomBytes } from 'node:crypto';
import type { SecretGenerator } from '@b-calendar/contracts';

/** 18 random bytes, base64url: 24 characters, 144 bits. */
export class RandomBytesSecretGenerator implements SecretGenerator {
  public generate(): string {
    return randomBytes(18).toString('base64url');
  }
}
