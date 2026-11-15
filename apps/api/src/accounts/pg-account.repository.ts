import { IDENTITY_PROVIDERS, NotFoundError } from '@b-calendar/contracts';
import type {
  Account,
  AccountId,
  AccountReader,
  AccountWriter,
  IdentityProviderName,
} from '@b-calendar/contracts';
import type { Kysely, Selectable, Transaction } from 'kysely';
import { z } from 'zod';
import type { AccountsTable, Database } from '../shared/shared.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

const IdentityRowSchema = z.object({ provider: z.enum(IDENTITY_PROVIDERS), subject: z.string() });

/** Accounts and their identities, in two tables, written together. */
export class PgAccountRepository implements AccountReader, AccountWriter {
  public constructor(
    private readonly db: Kysely<Database>,
    private readonly errors: DatabaseErrorTranslator,
  ) {}

  public async getById(id: AccountId): Promise<Account> {
    const row = await this.db
      .selectFrom('accounts')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    if (row === undefined) {
      throw new NotFoundError('Account', id);
    }
    return this.toAccount(row);
  }

  public async findByIdentity(
    provider: IdentityProviderName,
    subject: string,
  ): Promise<Account | null> {
    const row = await this.db
      .selectFrom('accounts')
      .innerJoin('account_identities', 'account_identities.account_id', 'accounts.id')
      .selectAll('accounts')
      .where('account_identities.provider', '=', provider)
      .where('account_identities.subject', '=', subject)
      .executeTakeFirst();
    return row === undefined ? null : this.toAccount(row);
  }

  public async create(account: Account): Promise<void> {
    try {
      await this.db.transaction().execute(async (trx) => {
        await trx.insertInto('accounts').values(this.toRow(account)).execute();
        await this.insertIdentities(trx, account);
      });
    } catch (error) {
      throw this.errors.translate(error);
    }
  }

  public async save(account: Account): Promise<void> {
    let updated: bigint;
    try {
      updated = await this.db.transaction().execute(async (trx) => {
        const result = await trx
          .updateTable('accounts')
          .set(this.toRow(account))
          .where('id', '=', account.id)
          .executeTakeFirst();
        if (result.numUpdatedRows > 0n) {
          await trx.deleteFrom('account_identities').where('account_id', '=', account.id).execute();
          await this.insertIdentities(trx, account);
        }
        return result.numUpdatedRows;
      });
    } catch (error) {
      throw this.errors.translate(error);
    }
    if (updated === 0n) {
      throw new NotFoundError('Account', account.id);
    }
  }

  private async insertIdentities(trx: Transaction<Database>, account: Account): Promise<void> {
    if (account.identities.length === 0) {
      return;
    }
    await trx
      .insertInto('account_identities')
      .values(
        account.identities.map(({ provider, subject }) => ({
          provider,
          subject,
          account_id: account.id,
        })),
      )
      .execute();
  }

  private toRow(account: Account): AccountsTable {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      created_at: account.createdAt,
    };
  }

  private async toAccount(row: Selectable<AccountsTable>): Promise<Account> {
    const identities = await this.db
      .selectFrom('account_identities')
      .select(['provider', 'subject'])
      .where('account_id', '=', row.id)
      .orderBy('provider')
      .orderBy('subject')
      .execute();
    return {
      id: row.id as AccountId,
      name: row.name,
      email: row.email,
      identities: identities.map((identity) => IdentityRowSchema.parse(identity)),
      createdAt: row.created_at,
    };
  }
}
