import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  AccountSession,
  AccountSessionService,
  AdminCredentials,
  LogIn,
  SecretMatcher,
} from '@b-calendar/contracts';

export interface LogInUseCaseConfig {
  /** The old admin password; null once it is retired. */
  readonly password: string | null;
}

export class LogInUseCase implements LogIn {
  public constructor(
    private readonly sessions: AccountSessionService,
    private readonly matcher: SecretMatcher,
    private readonly config: LogInUseCaseConfig,
  ) {}

  public execute(input: AdminCredentials): Promise<AccountSession> {
    const { password } = this.config;
    if (password === null || !this.matcher.matches(password, input.password)) {
      return Promise.reject(new UnauthenticatedError('Wrong password.'));
    }
    // The password opens the calendars nobody owns yet.
    return Promise.resolve(this.sessions.issue(null));
  }
}
