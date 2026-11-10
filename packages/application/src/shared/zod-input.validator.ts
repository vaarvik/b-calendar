import { ValidationError } from '@b-calendar/contracts';
import type { InputValidator } from '@b-calendar/contracts';
import type { z } from 'zod';

/** Parses with zod; every issue becomes part of one ValidationError. */
export class ZodInputValidator implements InputValidator {
  public validate<T>(schema: z.ZodType<T>, input: unknown): T {
    const result = schema.safeParse(input);
    if (result.success) {
      return result.data;
    }
    throw new ValidationError(
      'The input is invalid.',
      result.error.issues.map((issue) => ({
        path: issue.path.filter((key) => typeof key !== 'symbol'),
        message: issue.message,
      })),
    );
  }
}
