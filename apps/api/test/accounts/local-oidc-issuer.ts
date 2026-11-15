import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import type { JWTPayload } from 'jose';

interface PendingCode {
  readonly claims: JWTPayload;
  readonly nonce: string;
  readonly codeChallenge: string;
  readonly clientId: string;
}

/**
 * A stand-in for Google or Microsoft on localhost: discovery, keys and a token endpoint that
 * checks PKCE and signs ID tokens. Tests play the browser, which `authorize` stands for.
 */
export class LocalOidcIssuer {
  private server: Server | undefined;
  private keys: Awaited<ReturnType<typeof generateKeyPair>> | undefined;
  private readonly codes = new Map<string, PendingCode>();
  private issued = 0;
  /** `{tenantid}` in it plays Microsoft's issuer template. */
  public issuerTemplate = '';
  public origin = '';

  public get discoveryUrl(): string {
    return `${this.origin}/.well-known/openid-configuration`;
  }

  public async start(): Promise<void> {
    this.keys = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(this.keys.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
    this.server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', this.origin);
      const json = (status: number, body: unknown) => {
        response.writeHead(status, { 'content-type': 'application/json' });
        response.end(JSON.stringify(body));
      };
      if (url.pathname === '/.well-known/openid-configuration') {
        json(200, {
          issuer: this.issuerTemplate,
          authorization_endpoint: `${this.origin}/authorize`,
          token_endpoint: `${this.origin}/token`,
          jwks_uri: `${this.origin}/jwks`,
        });
      } else if (url.pathname === '/jwks') {
        json(200, { keys: [jwk] });
      } else if (url.pathname === '/token' && request.method === 'POST') {
        let body = '';
        request.on('data', (chunk: Buffer) => (body += chunk.toString()));
        request.on('end', () => {
          void this.token(new URLSearchParams(body)).then((idToken) => {
            json(
              idToken === null ? 400 : 200,
              idToken === null ? { error: 'invalid_grant' } : { id_token: idToken },
            );
          });
        });
      } else {
        json(404, {});
      }
    });
    await new Promise<void>((resolve) => this.server?.listen(0, '127.0.0.1', resolve));
    this.origin = `http://127.0.0.1:${String((this.server.address() as AddressInfo).port)}`;
    this.issuerTemplate ||= this.origin;
  }

  /**
   * What the provider does once the person has signed in: remembers a code for the claims, tied
   * to the request's nonce and PKCE challenge.
   */
  public authorize(authorizationUrl: string, claims: JWTPayload): { code: string; state: string } {
    const params = new URL(authorizationUrl).searchParams;
    this.issued += 1;
    const code = `code-${String(this.issued)}`;
    this.codes.set(code, {
      claims,
      nonce: params.get('nonce') ?? '',
      codeChallenge: params.get('code_challenge') ?? '',
      clientId: params.get('client_id') ?? '',
    });
    return { code, state: params.get('state') ?? '' };
  }

  public async stop(): Promise<void> {
    await new Promise((resolve) => this.server?.close(resolve));
  }

  private async token(form: URLSearchParams): Promise<string | null> {
    const pending = this.codes.get(form.get('code') ?? '');
    const verifier = form.get('code_verifier') ?? '';
    if (
      pending === undefined ||
      this.keys === undefined ||
      form.get('client_id') !== pending.clientId ||
      createHash('sha256').update(verifier).digest('base64url') !== pending.codeChallenge
    ) {
      return null;
    }
    this.codes.delete(form.get('code') ?? '');
    const tenant = typeof pending.claims.tid === 'string' ? pending.claims.tid : '';
    return new SignJWT({ nonce: pending.nonce, ...pending.claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(this.issuerTemplate.replace('{tenantid}', tenant))
      .setAudience(pending.clientId)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(this.keys.privateKey);
  }
}
