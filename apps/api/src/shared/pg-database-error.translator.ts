import { ConflictError } from '@b-calendar/contracts';
import type { DatabaseErrorTranslator } from './shared.ports.js';

const UNIQUE_VIOLATION = '23505';

export class PgDatabaseErrorTranslator implements DatabaseErrorTranslator {
  public translate(error: unknown): unknown {
    if (this.code(error) === UNIQUE_VIOLATION) {
      return new ConflictError('That already exists.', { cause: error });
    }
    return error;
  }

  private code(error: unknown): unknown {
    return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  }
}
