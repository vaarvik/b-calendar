import { describeCalendarRepositoryContract } from '@b-calendar/contracts/test-kit';
import { InMemoryAccountRepository, InMemoryCalendarRepository } from '@b-calendar/in-memory';

describeCalendarRepositoryContract('InMemoryCalendarRepository', () => {
  const repository = new InMemoryCalendarRepository();
  return Promise.resolve({
    writer: repository,
    reader: repository,
    accounts: new InMemoryAccountRepository(),
  });
});
