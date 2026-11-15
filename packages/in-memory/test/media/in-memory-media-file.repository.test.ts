import { describeMediaFileRepositoryContract } from '@b-calendar/contracts/test-kit';
import { InMemoryAccountRepository, InMemoryMediaFileRepository } from '@b-calendar/in-memory';

describeMediaFileRepositoryContract('InMemoryMediaFileRepository', () => {
  const repository = new InMemoryMediaFileRepository();
  return Promise.resolve({
    writer: repository,
    reader: repository,
    accounts: new InMemoryAccountRepository(),
  });
});
