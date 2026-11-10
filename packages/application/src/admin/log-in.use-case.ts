import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  AdminCredentials,
  AdminSession,
  AdminSessionService,
  LogIn,
  SecretMatcher,
} from '@b-calendar/contracts';

export interface LogInUseCaseConfig {
  readonly password: string;
}

export class LogInUseCase implements LogIn {
  public constructor(
    private readonly sessions: AdminSessionService,
    private readonly matcher: SecretMatcher,
    private readonly config: LogInUseCaseConfig,
  ) {}

  public execute(input: AdminCredentials): Promise<AdminSession> {
    if (!this.matcher.matches(this.config.password, input.password)) {
      return Promise.reject(new UnauthenticatedError('Wrong password.'));
    }
    return Promise.resolve(this.sessions.issue());
  }
}
