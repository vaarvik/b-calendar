import { createHash } from 'node:crypto';
import { UnauthenticatedError } from '@b-calendar/contracts';
import type {
  IdentityProvider,
  IdentityProviderName,
  SignInChallenge,
  VerifiedIdentity,
} from '@b-calendar/contracts';
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import { z } from 'zod';
import type { OidcClaimsMapper } from './accounts.ports.js';

export interface OidcIdentityProviderConfig {
  /** `<issuer>/.well-known/openid-configuration`. */
  readonly discoveryUrl: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

const DiscoverySchema = z.object({
  issuer: z.string(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  jwks_uri: z.url(),
});

const TokenResponseSchema = z.object({ id_token: z.string() });

type Discovery = z.infer<typeof DiscoverySchema> & {
  readonly keys: ReturnType<typeof createRemoteJWKSet>;
};

/** OpenID Connect with the authorization code flow, PKCE (S256) and a nonce. */
export class OidcIdentityProvider implements IdentityProvider {
  public readonly name: IdentityProviderName;
  private discovery: Promise<Discovery> | undefined;

  public constructor(
    private readonly claims: OidcClaimsMapper,
    private readonly config: OidcIdentityProviderConfig,
  ) {
    this.name = claims.provider;
  }

  public async authorizationUrl(challenge: SignInChallenge, redirectUri: string): Promise<string> {
    const { authorization_endpoint } = await this.discover();
    const url = new URL(authorization_endpoint);
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      state: challenge.state,
      nonce: challenge.nonce,
      code_challenge: createHash('sha256').update(challenge.codeVerifier).digest('base64url'),
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  public async verify(
    code: string,
    challenge: SignInChallenge,
    redirectUri: string,
  ): Promise<VerifiedIdentity> {
    const discovery = await this.discover();
    const response = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code_verifier: challenge.codeVerifier,
      }),
    });
    const tokens = TokenResponseSchema.safeParse(response.ok ? await response.json() : null);
    if (!tokens.success) {
      throw new UnauthenticatedError(`${this.name} did not accept the sign-in.`);
    }
    const idToken = tokens.data.id_token;
    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, discovery.keys, {
        issuer: this.claims.issuer(discovery.issuer, decodeJwt(idToken)),
        audience: this.config.clientId,
        clockTolerance: 60,
      }));
    } catch (error) {
      throw new UnauthenticatedError(`The ${this.name} token does not hold.`, { cause: error });
    }
    const identity = payload.nonce === challenge.nonce ? this.claims.identity(payload) : null;
    if (identity === null) {
      throw new UnauthenticatedError(`The ${this.name} token does not name anyone.`);
    }
    return { ...identity, provider: this.name };
  }

  /** The provider's endpoints and keys, fetched once (again after a failure). */
  private discover(): Promise<Discovery> {
    this.discovery ??= (async () => {
      const response = await fetch(this.config.discoveryUrl);
      if (!response.ok) {
        throw new Error(`${this.name} discovery answered ${String(response.status)}.`);
      }
      const document = DiscoverySchema.parse(await response.json());
      return { ...document, keys: createRemoteJWKSet(new URL(document.jwks_uri)) };
    })().catch((error: unknown) => {
      this.discovery = undefined;
      throw error;
    });
    return this.discovery;
  }
}
