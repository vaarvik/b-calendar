import { describeAccountRepositoryContract } from '@b-calendar/contracts/test-kit';
import { InMemoryAccountRepository } from '@b-calendar/in-memory';

describeAccountRepositoryContract('InMemoryAccountRepository', () => {
  const repository = new InMemoryAccountRepository();
  return Promise.resolve({ writer: repository, reader: repository });
});
