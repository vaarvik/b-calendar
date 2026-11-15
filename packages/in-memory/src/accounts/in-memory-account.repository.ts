import { ConflictError, NotFoundError } from '@b-calendar/contracts';
import type {
  Account,
  AccountId,
  AccountReader,
  AccountWriter,
  IdentityProviderName,
} from '@b-calendar/contracts';

/** Accounts in a map. Copies on the way in and out, like a database would. */
export class InMemoryAccountRepository implements AccountReader, AccountWriter {
  private readonly rows = new Map<AccountId, Account>();

  public getById(id: AccountId): Promise<Account> {
    const account = this.rows.get(id);
    return account === undefined
      ? Promise.reject(new NotFoundError('Account', id))
      : Promise.resolve(structuredClone(account));
  }

  public findByIdentity(provider: IdentityProviderName, subject: string): Promise<Account | null> {
    const account = [...this.rows.values()].find((row) =>
      row.identities.some(
        (identity) => identity.provider === provider && identity.subject === subject,
      ),
    );
    return Promise.resolve(account === undefined ? null : structuredClone(account));
  }

  public create(account: Account): Promise<void> {
    if (this.rows.has(account.id) || this.identityTaken(account)) {
      return Promise.reject(new ConflictError(`Account ${account.id} or its identity exists.`));
    }
    this.rows.set(account.id, structuredClone(account));
    return Promise.resolve();
  }

  public save(account: Account): Promise<void> {
    if (!this.rows.has(account.id)) {
      return Promise.reject(new NotFoundError('Account', account.id));
    }
    if (this.identityTaken(account)) {
      return Promise.reject(new ConflictError(`An identity of ${account.id} belongs to another.`));
    }
    this.rows.set(account.id, structuredClone(account));
    return Promise.resolve();
  }

  private identityTaken(account: Account): boolean {
    return [...this.rows.values()].some(
      (row) =>
        row.id !== account.id &&
        row.identities.some((identity) =>
          account.identities.some(
            (mine) => mine.provider === identity.provider && mine.subject === identity.subject,
          ),
        ),
    );
  }
}
