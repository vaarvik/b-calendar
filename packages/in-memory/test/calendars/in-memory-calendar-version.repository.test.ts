import { describeCalendarVersionRepositoryContract } from '@b-calendar/contracts/test-kit';
import {
  InMemoryCalendarRepository,
  InMemoryCalendarVersionRepository,
} from '@b-calendar/in-memory';

describeCalendarVersionRepositoryContract('InMemoryCalendarVersionRepository', () => {
  const repository = new InMemoryCalendarVersionRepository();
  return Promise.resolve({
    writer: repository,
    reader: repository,
    calendars: new InMemoryCalendarRepository(),
  });
});
