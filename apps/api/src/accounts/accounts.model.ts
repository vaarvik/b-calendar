import type {
  CompleteSignIn,
  GetMe,
  ListIdentityProviders,
  LogIn,
  StartSignIn,
} from '@b-calendar/contracts';

/** Signing in and out over HTTP. */
export interface AuthUseCases {
  readonly startSignIn: StartSignIn;
  readonly completeSignIn: CompleteSignIn;
  readonly getMe: GetMe;
  readonly listIdentityProviders: ListIdentityProviders;
  /** The old admin password, while it is set. */
  readonly logIn: LogIn;
}
