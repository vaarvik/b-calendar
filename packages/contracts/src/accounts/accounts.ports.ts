import type { AccountId } from '../shared/shared.model.js';
import type {
  Account,
  AccountSession,
  IdentityProviderName,
  SignInChallenge,
  VerifiedIdentity,
} from './accounts.model.js';

/** Reads accounts. */
export interface AccountReader {
  /** @throws NotFoundError when no account has this id. */
  getById(id: AccountId): Promise<Account>;
  /** The account a provider's subject belongs to, or null for someone new. */
  findByIdentity(provider: IdentityProviderName, subject: string): Promise<Account | null>;
}

/** Stores accounts with their identities. */
export interface AccountWriter {
  /** @throws ConflictError when the id or one of the identities is taken. */
  create(account: Account): Promise<void>;
  /**
   * Replaces an account (name, email, identities).
   *
   * @throws NotFoundError when no account has this id.
   */
  save(account: Account): Promise<void>;
}

/** One SSO provider, spoken to with OpenID Connect: authorization code, PKCE and a nonce. */
export interface IdentityProvider {
  readonly name: IdentityProviderName;
  /** @returns where to send the browser to sign in. */
  authorizationUrl(challenge: SignInChallenge, redirectUri: string): Promise<string>;
  /**
   * Trades the code for an ID token and checks it: signature, issuer, audience, expiry, nonce.
   *
   * @throws UnauthenticatedError when the code or the token does not hold.
   */
  verify(code: string, challenge: SignInChallenge, redirectUri: string): Promise<VerifiedIdentity>;
}

/** Seals a sign-in challenge for the cookie, so it cannot be read back changed. */
export interface SignInChallengeSealer {
  seal(challenge: SignInChallenge): string;
  /** @throws UnauthenticatedError when it was tampered with or has expired. */
  open(sealed: string): SignInChallenge;
}

/** Issues and verifies session tokens. */
export interface AccountSessionService {
  issue(owner: AccountId): AccountSession;
  /** @throws UnauthenticatedError when the token is malformed, forged or expired. */
  verify(token: string): AccountId;
}
