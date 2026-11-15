import type {
  IdentityProvider,
  IdentityProviderName,
  ListIdentityProviders,
} from '@b-calendar/contracts';

export class ListIdentityProvidersUseCase implements ListIdentityProviders {
  public constructor(private readonly providers: readonly IdentityProvider[]) {}

  public execute(): IdentityProviderName[] {
    return this.providers.map((provider) => provider.name);
  }
}
