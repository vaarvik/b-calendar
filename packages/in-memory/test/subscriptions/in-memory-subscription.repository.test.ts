import { describeSubscriptionRepositoryContract } from '@b-calendar/contracts/test-kit';
import {
  InMemoryCalendarRepository,
  InMemoryMemberRepository,
  InMemorySubscriptionRepository,
} from '@b-calendar/in-memory';

describeSubscriptionRepositoryContract('InMemorySubscriptionRepository', () => {
  const repository = new InMemorySubscriptionRepository();
  return Promise.resolve({
    writer: repository,
    reader: repository,
    calendars: new InMemoryCalendarRepository(),
    members: new InMemoryMemberRepository(),
  });
});
