import type { AccountId } from '../shared/shared.model.js';
import type { Account, AccountSession, IdentityProviderName } from './accounts.model.js';

export interface StartSignInInput {
  readonly provider: string;
  /** A path under `/admin`; anything else lands on `/admin`. */
  readonly returnTo: string;
}

export interface StartSignInOutput {
  readonly redirectUrl: string;
  /** For the short-lived sign-in cookie. */
  readonly sealedChallenge: string;
}

/** Someone starts signing in with a provider. */
export interface StartSignIn {
  /** @throws NotFoundError when the provider is unknown or not configured. */
  execute(input: StartSignInInput): Promise<StartSignInOutput>;
}

export interface CompleteSignInInput {
  readonly provider: string;
  readonly code: string;
  /** The `state` the provider sent back. */
  readonly state: string;
  /** From the sign-in cookie. */
  readonly sealedChallenge: string;
}

export interface CompleteSignInOutput {
  readonly session: AccountSession;
  readonly returnTo: string;
}

/**
 * The provider sent someone back. Their account is found by the provider's subject, or created;
 * the name and verified email are refreshed. When that email is the owner's (`OWNER_EMAIL`), the
 * account takes over every calendar nobody owns yet.
 */
export interface CompleteSignIn {
  /**
   * @throws UnauthenticatedError when the cookie, the state or the provider's answer does not
   * hold.
   * @throws NotFoundError when the provider is unknown or not configured.
   */
  execute(input: CompleteSignInInput): Promise<CompleteSignInOutput>;
}

/** The signed-in account. */
export interface GetMe {
  /** @throws NotFoundError when the account is gone. */
  execute(input: { readonly accountId: AccountId }): Promise<Account>;
}

/** The providers this server is set up for, in the order the buttons show. */
export interface ListIdentityProviders {
  execute(): IdentityProviderName[];
}
