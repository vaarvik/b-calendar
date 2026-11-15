import { NotFoundError } from '@b-calendar/contracts';
import type {
  Clock,
  IdentityProvider,
  SecretGenerator,
  SignInChallenge,
  SignInChallengeSealer,
  StartSignIn,
  StartSignInInput,
  StartSignInOutput,
} from '@b-calendar/contracts';

export interface StartSignInUseCaseConfig {
  /** Where providers send people back: `<origin>/v1/auth/<provider>/callback`. */
  readonly callbackUrl: (provider: string) => string;
  /** How long one may take at the provider. */
  readonly challengeMinutes: number;
}

export class StartSignInUseCase implements StartSignIn {
  public constructor(
    private readonly providers: readonly IdentityProvider[],
    private readonly sealer: SignInChallengeSealer,
    private readonly secrets: SecretGenerator,
    private readonly clock: Clock,
    private readonly config: StartSignInUseCaseConfig,
  ) {}

  public async execute(input: StartSignInInput): Promise<StartSignInOutput> {
    const provider = this.providers.find((candidate) => candidate.name === input.provider);
    if (provider === undefined) {
      throw new NotFoundError('IdentityProvider', input.provider);
    }
    const challenge: SignInChallenge = {
      provider: provider.name,
      state: this.secrets.generate(),
      nonce: this.secrets.generate(),
      // PKCE wants 43 to 128 characters.
      codeVerifier: this.secrets.generate() + this.secrets.generate(),
      returnTo: this.safeReturnTo(input.returnTo),
      expiresAt: new Date(this.clock.now().getTime() + this.config.challengeMinutes * 60_000),
    };
    return {
      redirectUrl: await provider.authorizationUrl(
        challenge,
        this.config.callbackUrl(provider.name),
      ),
      sealedChallenge: this.sealer.seal(challenge),
    };
  }

  /** Only a path inside the admin, so a sign-in link cannot send anyone elsewhere. */
  private safeReturnTo(returnTo: string): string {
    return /^\/admin(\/[A-Za-z0-9/_-]*)?(\?[A-Za-z0-9=&_-]*)?$/.test(returnTo)
      ? returnTo
      : '/admin';
  }
}
