import { UnauthenticatedError } from '@b-calendar/contracts';
import type { SignInChallenge } from '@b-calendar/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GoogleOidcClaimsMapper } from '../../src/accounts/google-oidc-claims.mapper.js';
import { MicrosoftOidcClaimsMapper } from '../../src/accounts/microsoft-oidc-claims.mapper.js';
import { OidcIdentityProvider } from '../../src/accounts/oidc-identity.provider.js';
import { LocalOidcIssuer } from './local-oidc-issuer.js';

const challenge: SignInChallenge = {
  provider: 'google',
  state: 'state-1',
  nonce: 'nonce-1',
  codeVerifier: 'v'.repeat(48),
  returnTo: '/admin',
  expiresAt: new Date(Date.now() + 600_000),
};
const redirect = 'https://cal.example/v1/auth/google/callback';

describe('OidcIdentityProvider', () => {
  const google = new LocalOidcIssuer();
  const microsoft = new LocalOidcIssuer();
  let googleProvider: OidcIdentityProvider;
  let microsoftProvider: OidcIdentityProvider;

  beforeAll(async () => {
    await google.start();
    microsoft.issuerTemplate = 'https://login.example/{tenantid}/v2.0';
    await microsoft.start();
    googleProvider = new OidcIdentityProvider(new GoogleOidcClaimsMapper(), {
      discoveryUrl: google.discoveryUrl,
      clientId: 'google-client',
      clientSecret: 'g-secret',
    });
    microsoftProvider = new OidcIdentityProvider(new MicrosoftOidcClaimsMapper(), {
      discoveryUrl: microsoft.discoveryUrl,
      clientId: 'ms-client',
      clientSecret: 'm-secret',
    });
  });

  afterAll(async () => {
    await google.stop();
    await microsoft.stop();
  });

  it('asks for the code flow with PKCE (S256), a nonce and the state', async () => {
    const url = new URL(await googleProvider.authorizationUrl(challenge, redirect));

    expect(url.origin + url.pathname).toBe(`${google.origin}/authorize`);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      response_type: 'code',
      client_id: 'google-client',
      redirect_uri: redirect,
      scope: 'openid email profile',
      state: 'state-1',
      nonce: 'nonce-1',
      code_challenge_method: 'S256',
    });
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('trades the code for a verified identity, with the email only when Google verified it', async () => {
    const url = await googleProvider.authorizationUrl(challenge, redirect);
    const verified = google.authorize(url, {
      sub: 'g-1',
      email: 'ann@example.com',
      email_verified: true,
      name: 'Ann',
    });
    const unverified = google.authorize(url, {
      sub: 'g-2',
      email: 'bob@example.com',
      email_verified: false,
    });

    await expect(googleProvider.verify(verified.code, challenge, redirect)).resolves.toEqual({
      provider: 'google',
      subject: 'g-1',
      email: 'ann@example.com',
      name: 'Ann',
    });
    await expect(googleProvider.verify(unverified.code, challenge, redirect)).resolves.toEqual({
      provider: 'google',
      subject: 'g-2',
      email: null,
      name: 'Google-bruker',
    });
  });

  it('refuses a used or unknown code, a wrong verifier, and a token for another nonce', async () => {
    const url = await googleProvider.authorizationUrl(challenge, redirect);
    const { code } = google.authorize(url, { sub: 'g-1' });
    await googleProvider.verify(code, challenge, redirect);
    const second = google.authorize(url, { sub: 'g-1' });
    const third = google.authorize(url, { sub: 'g-1' });

    for (const attempt of [
      googleProvider.verify(code, challenge, redirect),
      googleProvider.verify('nope', challenge, redirect),
      googleProvider.verify(second.code, { ...challenge, codeVerifier: 'w'.repeat(48) }, redirect),
      googleProvider.verify(third.code, { ...challenge, nonce: 'other' }, redirect),
    ]) {
      await expect(attempt).rejects.toBeInstanceOf(UnauthenticatedError);
    }
  });

  it('refuses a token signed for another app', async () => {
    const url = (await googleProvider.authorizationUrl(challenge, redirect)).replace(
      'client_id=google-client',
      'client_id=other-client',
    );
    const { code } = google.authorize(url, { sub: 'g-1' });
    const other = new OidcIdentityProvider(new GoogleOidcClaimsMapper(), {
      discoveryUrl: google.discoveryUrl,
      clientId: 'other-client',
      clientSecret: 'x',
    });
    const token = await other.verify(code, challenge, redirect);
    expect(token.subject).toBe('g-1');
    // The same code flow, but the app that checks is not the audience.
    const { code: again } = google.authorize(url, { sub: 'g-1' });
    await expect(googleProvider.verify(again, challenge, redirect)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it('takes Microsoft’s tenant into the issuer and the subject, and trusts only vouched emails', async () => {
    const url = await microsoftProvider.authorizationUrl(challenge, redirect);
    const personal = microsoft.authorize(url, {
      sub: 'm-1',
      tid: '9188040d-6c67-4c5b-b112-36a304b66dad',
      email: 'ann@outlook.com',
      name: 'Ann',
    });
    const work = microsoft.authorize(url, {
      sub: 'm-1',
      tid: 'tenant-b',
      email: 'boss@corp.example',
    });
    const vouched = microsoft.authorize(url, {
      sub: 'm-2',
      tid: 'tenant-b',
      email: 'eve@corp.example',
      xms_edov: true,
      name: 'Eve',
    });

    await expect(microsoftProvider.verify(personal.code, challenge, redirect)).resolves.toEqual({
      provider: 'microsoft',
      subject: '9188040d-6c67-4c5b-b112-36a304b66dad:m-1',
      email: 'ann@outlook.com',
      name: 'Ann',
    });
    await expect(microsoftProvider.verify(work.code, challenge, redirect)).resolves.toMatchObject({
      subject: 'tenant-b:m-1',
      email: null,
      name: 'Microsoft-bruker',
    });
    await expect(
      microsoftProvider.verify(vouched.code, challenge, redirect),
    ).resolves.toMatchObject({ email: 'eve@corp.example' });
  });

  it('refuses a token without a subject, and a provider whose discovery fails, until it answers', async () => {
    const url = await googleProvider.authorizationUrl(challenge, redirect);
    const { code } = google.authorize(url, { name: 'Nobody' });
    const broken = new OidcIdentityProvider(new GoogleOidcClaimsMapper(), {
      discoveryUrl: `${google.origin}/missing`,
      clientId: 'google-client',
      clientSecret: 'x',
    });

    await expect(googleProvider.verify(code, challenge, redirect)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(broken.authorizationUrl(challenge, redirect)).rejects.toThrow('discovery');
    await expect(broken.authorizationUrl(challenge, redirect)).rejects.toThrow('discovery');
  });
});
