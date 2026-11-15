import { NotFoundError, UnauthenticatedError } from '@b-calendar/contracts';
import type {
  Account,
  AccountReader,
  AccountSessionService,
  AccountWriter,
  Clock,
  CompleteSignIn,
  CompleteSignInInput,
  CompleteSignInOutput,
  IdGenerator,
  IdentityProvider,
  SecretMatcher,
  SignInChallengeSealer,
  VerifiedIdentity,
} from '@b-calendar/contracts';
import type { StartSignInUseCaseConfig } from './start-sign-in.use-case.js';

export type CompleteSignInUseCaseConfig = Pick<StartSignInUseCaseConfig, 'callbackUrl'>;

export class CompleteSignInUseCase implements CompleteSignIn {
  public constructor(
    private readonly providers: readonly IdentityProvider[],
    private readonly sealer: SignInChallengeSealer,
    private readonly matcher: SecretMatcher,
    private readonly accountReader: AccountReader,
    private readonly accountWriter: AccountWriter,
    private readonly sessions: AccountSessionService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly config: CompleteSignInUseCaseConfig,
  ) {}

  public async execute(input: CompleteSignInInput): Promise<CompleteSignInOutput> {
    const provider = this.providers.find((candidate) => candidate.name === input.provider);
    if (provider === undefined) {
      throw new NotFoundError('IdentityProvider', input.provider);
    }
    const challenge = this.sealer.open(input.sealedChallenge);
    if (
      challenge.provider !== provider.name ||
      !this.matcher.matches(challenge.state, input.state)
    ) {
      throw new UnauthenticatedError('The sign-in did not come back as it was sent.');
    }
    const identity = await provider.verify(
      input.code,
      challenge,
      this.config.callbackUrl(provider.name),
    );
    const account = await this.account(identity);
    return { session: this.sessions.issue(account.id), returnTo: challenge.returnTo };
  }

  /** The account of this identity, created on the first sign-in, with a fresh name and email. */
  private async account(identity: VerifiedIdentity): Promise<Account> {
    const known = await this.accountReader.findByIdentity(identity.provider, identity.subject);
    if (known === null) {
      const account: Account = {
        id: this.ids.accountId(),
        name: identity.name,
        email: identity.email,
        identities: [{ provider: identity.provider, subject: identity.subject }],
        createdAt: this.clock.now(),
      };
      await this.accountWriter.create(account);
      return account;
    }
    const refreshed = { ...known, name: identity.name, email: identity.email ?? known.email };
    await this.accountWriter.save(refreshed);
    return refreshed;
  }
}
