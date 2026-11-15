import { describeMemberRepositoryContract } from '@b-calendar/contracts/test-kit';
import { InMemoryCalendarRepository, InMemoryMemberRepository } from '@b-calendar/in-memory';

describeMemberRepositoryContract('InMemoryMemberRepository', () => {
  const repository = new InMemoryMemberRepository();
  return Promise.resolve({
    writer: repository,
    reader: repository,
    calendars: new InMemoryCalendarRepository(),
  });
});
