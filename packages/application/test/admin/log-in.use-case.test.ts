import { LogInUseCase } from '@b-calendar/application';
import { UnauthenticatedError } from '@b-calendar/contracts';
import { ConstantTimeSecretMatcher } from '@b-calendar/domain';
import { describe, expect, it } from 'vitest';
import { PlainSessions } from '../shared/fakes.js';

describe('LogIn', () => {
  const logIn = new LogInUseCase(new PlainSessions(), new ConstantTimeSecretMatcher(), {
    password: 'correct horse',
  });

  it('issues a session for the unowned calendars with the right password', async () => {
    await expect(logIn.execute({ password: 'correct horse' })).resolves.toMatchObject({
      token: 'session:-',
    });
  });

  it('refuses a wrong password, and every password once it is retired', async () => {
    const retired = new LogInUseCase(new PlainSessions(), new ConstantTimeSecretMatcher(), {
      password: null,
    });

    await expect(logIn.execute({ password: 'wrong' })).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(retired.execute({ password: 'correct horse' })).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });
});
