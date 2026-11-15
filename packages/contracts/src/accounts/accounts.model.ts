import type { AccountId } from '../shared/shared.model.js';

/** The SSO providers someone can sign in with. */
export const IDENTITY_PROVIDERS = ['google', 'microsoft'] as const;
export type IdentityProviderName = (typeof IDENTITY_PROVIDERS)[number];

/** One provider's name for a person: its stable subject id, never their email. */
export interface AccountIdentity {
  readonly provider: IdentityProviderName;
  readonly subject: string;
}

/** Someone who signed in with SSO. Owns calendars; may link several providers. */
export interface Account {
  readonly id: AccountId;
  readonly name: string;
  /** The verified email the provider gave at the last sign-in; null when it gave none. */
  readonly email: string | null;
  readonly identities: readonly AccountIdentity[];
  readonly createdAt: Date;
}

/** What a provider vouches for, from an ID token whose signature, issuer, audience and nonce held. */
export interface VerifiedIdentity extends AccountIdentity {
  /** Only an email the provider says is verified; otherwise null. */
  readonly email: string | null;
  readonly name: string;
}

/** The most an account may have, so one account cannot fill the disk or flood push. */
export interface AccountLimits {
  readonly calendars: number;
  readonly mediaBytes: number;
  readonly membersPerCalendar: number;
}

/**
 * What a sign-in must remember across the trip to the provider and back: kept sealed in a
 * short-lived cookie, never on the server.
 */
export interface SignInChallenge {
  readonly provider: IdentityProviderName;
  /** Sent to the provider and compared when it comes back (CSRF). */
  readonly state: string;
  /** Must come back inside the ID token (replay). */
  readonly nonce: string;
  /** PKCE: its hash goes to the provider, the verifier itself with the code exchange. */
  readonly codeVerifier: string;
  /** Where in the admin to land afterwards: a path under `/admin`. */
  readonly returnTo: string;
  readonly expiresAt: Date;
}

/** A signed-in session's token, kept in an HttpOnly cookie. */
export interface AccountSession {
  readonly token: string;
  readonly expiresAt: Date;
}
