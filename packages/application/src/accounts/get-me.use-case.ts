import type { Account, AccountId, AccountReader, GetMe } from '@b-calendar/contracts';

export class GetMeUseCase implements GetMe {
  public constructor(private readonly accounts: AccountReader) {}

  public execute(input: { readonly accountId: AccountId }): Promise<Account> {
    return this.accounts.getById(input.accountId);
  }
}
