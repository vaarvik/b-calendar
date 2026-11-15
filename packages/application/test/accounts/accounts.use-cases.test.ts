import {
  CompleteSignInUseCase,
  GetMeUseCase,
  ListIdentityProvidersUseCase,
  StartSignInUseCase,
} from '@b-calendar/application';
import { NotFoundError, UnauthenticatedError } from '@b-calendar/contracts';
import { T0, hoursAfter } from '@b-calendar/contracts/test-kit';
import { ConstantTimeSecretMatcher } from '@b-calendar/domain';
import { InMemoryAccountRepository } from '@b-calendar/in-memory';
import { describe, expect, it } from 'vitest';
import {
  CountingSecrets,
  FakeIdentityProvider,
  JsonChallengeSealer,
  ManualClock,
  PlainSessions,
  RandomIds,
} from '../shared/fakes.js';

const callbackUrl = (provider: string) => `https://cal.example/v1/auth/${provider}/callback`;

function setup() {
  const clock = new ManualClock();
  const google = new FakeIdentityProvider('google');
  const microsoft = new FakeIdentityProvider('microsoft');
  const providers = [google, microsoft];
  const sealer = new JsonChallengeSealer(clock);
  const accounts = new InMemoryAccountRepository();
  const sessions = new PlainSessions();
  return {
    clock,
    google,
    accounts,
    sessions,
    start: new StartSignInUseCase(providers, sealer, new CountingSecrets(), clock, {
      callbackUrl,
      challengeMinutes: 10,
    }),
    complete: new CompleteSignInUseCase(
      providers,
      sealer,
      new ConstantTimeSecretMatcher(),
      accounts,
      accounts,
      sessions,
      new RandomIds(),
      clock,
      { callbackUrl },
    ),
    me: new GetMeUseCase(accounts),
    list: new ListIdentityProvidersUseCase(providers),
  };
}

async function signIn(
  tools: ReturnType<typeof setup>,
  identity: { subject: string; email: string | null; name: string },
) {
  const started = await tools.start.execute({ provider: 'google', returnTo: '/admin/abc' });
  tools.google.identities.set('code', identity);
  const state = tools.google.asked.at(-1)?.challenge.state ?? '';
  return tools.complete.execute({
    provider: 'google',
    code: 'code',
    state,
    sealedChallenge: started.sealedChallenge,
  });
}

describe('StartSignIn', () => {
  it('sends the browser to the provider with fresh secrets, and seals them for the cookie', async () => {
    const { start, google } = setup();

    const started = await start.execute({ provider: 'google', returnTo: '/admin/abc?steg=del' });

    expect(started.redirectUrl).toBe('https://google.example/auth?state=secret-1');
    expect(google.asked).toEqual([
      {
        redirectUri: 'https://cal.example/v1/auth/google/callback',
        challenge: {
          provider: 'google',
          state: 'secret-1',
          nonce: 'secret-2',
          codeVerifier: 'secret-3secret-4',
          returnTo: '/admin/abc?steg=del',
          expiresAt: hoursAfter(T0, 1 / 6),
        },
      },
    ]);
    expect(started.sealedChallenge).toContain('secret-1');
  });

  it('lands only inside the admin, and refuses an unknown provider', async () => {
    const { start, google } = setup();

    await start.execute({ provider: 'google', returnTo: 'https://evil.example/admin' });
    await start.execute({ provider: 'google', returnTo: '//evil.example' });

    expect(google.asked.map((asked) => asked.challenge.returnTo)).toEqual(['/admin', '/admin']);
    await expect(start.execute({ provider: 'apple', returnTo: '/admin' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('CompleteSignIn', () => {
  it('creates an account the first time and finds it again the next, with a fresh name and email', async () => {
    const tools = setup();

    const first = await signIn(tools, { subject: 's-1', email: 'a@example.com', name: 'Ann' });
    const again = await signIn(tools, { subject: 's-1', email: null, name: 'Ann B' });

    expect(first.returnTo).toBe('/admin/abc');
    const owner = tools.sessions.verify(first.session.token);
    expect(tools.sessions.verify(again.session.token)).toBe(owner);
    await expect(tools.me.execute({ accountId: owner })).resolves.toMatchObject({
      name: 'Ann B',
      email: 'a@example.com',
      identities: [{ provider: 'google', subject: 's-1' }],
      createdAt: T0,
    });
  });

  it('refuses a wrong state, a tampered or expired cookie, another provider and a bad code', async () => {
    const { start, complete, google, clock } = setup();
    google.identities.set('code', { subject: 's', email: null, name: 'S' });
    const { sealedChallenge } = await start.execute({ provider: 'google', returnTo: '/admin' });
    const attempt = (overrides: Partial<Parameters<typeof complete.execute>[0]>) =>
      complete.execute({
        provider: 'google',
        code: 'code',
        state: 'secret-1',
        sealedChallenge,
        ...overrides,
      });

    await expect(attempt({ state: 'secret-9' })).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(attempt({ sealedChallenge: 'forged' })).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(attempt({ provider: 'microsoft' })).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(attempt({ provider: 'apple' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(attempt({ code: 'other' })).rejects.toBeInstanceOf(UnauthenticatedError);
    clock.set(hoursAfter(T0, 1));
    await expect(attempt({})).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe('ListIdentityProviders', () => {
  it('lists the configured providers in order', () => {
    expect(setup().list.execute()).toEqual(['google', 'microsoft']);
  });
});
