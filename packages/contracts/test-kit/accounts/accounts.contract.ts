import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '../../src/index.js';
import type { AccountReader, AccountWriter } from '../../src/index.js';
import { FixtureHolder } from '../fixture.js';
import type { FixtureFactory } from '../fixture.js';
import { TestData } from '../test-data.js';

export interface AccountRepositoryFixture {
  readonly writer: AccountWriter;
  readonly reader: AccountReader;
}

/** Behaviour every AccountWriter and AccountReader pair must have. */
export function describeAccountRepositoryContract(
  name: string,
  factory: FixtureFactory<AccountRepositoryFixture>,
): void {
  describe(`${name} satisfies AccountReader and AccountWriter`, () => {
    const fixture = new FixtureHolder(factory);

    it('reads back an account by id and by each of its identities', async () => {
      const data = new TestData();
      const account = data.account({
        name: 'Johann Ø',
        identities: [
          { provider: 'google', subject: 'g-1' },
          { provider: 'microsoft', subject: 'm-1' },
        ],
      });
      await fixture.current.writer.create(account);

      await expect(fixture.current.reader.getById(account.id)).resolves.toEqual(account);
      await expect(fixture.current.reader.findByIdentity('microsoft', 'm-1')).resolves.toEqual(
        account,
      );
      await expect(fixture.current.reader.findByIdentity('google', 'm-1')).resolves.toBeNull();
    });

    it('throws NotFoundError for an unknown id, and ConflictError for a taken id or identity', async () => {
      const data = new TestData();
      const account = data.account();
      await fixture.current.writer.create(account);

      await expect(fixture.current.reader.getById(data.accountId())).rejects.toBeInstanceOf(
        NotFoundError,
      );
      await expect(fixture.current.writer.create(account)).rejects.toBeInstanceOf(ConflictError);
      await expect(
        fixture.current.writer.create(data.account({ identities: account.identities })),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('replaces an account, identities included, and refuses an unknown one', async () => {
      const data = new TestData();
      const account = data.account({ email: null });
      await fixture.current.writer.create(account);
      const changed = {
        ...account,
        name: 'Nytt navn',
        email: 'ny@example.com',
        identities: [...account.identities, { provider: 'microsoft' as const, subject: 'm-2' }],
      };

      await fixture.current.writer.save(changed);

      await expect(fixture.current.reader.getById(account.id)).resolves.toEqual(changed);
      await expect(fixture.current.reader.findByIdentity('microsoft', 'm-2')).resolves.toEqual(
        changed,
      );
      await expect(fixture.current.writer.save(data.account())).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
}
