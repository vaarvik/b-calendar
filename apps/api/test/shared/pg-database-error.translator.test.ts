import { ConflictError } from '@b-calendar/contracts';
import { describe, expect, it } from 'vitest';
import { PgDatabaseErrorTranslator } from '../../src/shared/pg-database-error.translator.js';

describe('PgDatabaseErrorTranslator', () => {
  const translator = new PgDatabaseErrorTranslator();

  it('turns a unique violation into a ConflictError', () => {
    expect(translator.translate({ code: '23505' })).toBeInstanceOf(ConflictError);
  });

  it.each([{ code: '42P01' }, new Error('x'), null, 'text'])('passes %o through', (error) => {
    expect(translator.translate(error)).toBe(error);
  });
});
