import type {
  CompleteSignIn,
  GetMe,
  ListIdentityProviders,
  StartSignIn,
} from '@b-calendar/contracts';

/** Signing in and out over HTTP. */
export interface AuthUseCases {
  readonly startSignIn: StartSignIn;
  readonly completeSignIn: CompleteSignIn;
  readonly getMe: GetMe;
  readonly listIdentityProviders: ListIdentityProviders;
}
