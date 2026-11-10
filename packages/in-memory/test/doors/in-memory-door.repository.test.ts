import { describeDoorRepositoryContract } from '@b-calendar/contracts/test-kit';
import { InMemoryCalendarRepository, InMemoryDoorRepository } from '@b-calendar/in-memory';

describeDoorRepositoryContract('InMemoryDoorRepository', () => {
  const repository = new InMemoryDoorRepository();
  return Promise.resolve({
    writer: repository,
    reader: repository,
    calendars: new InMemoryCalendarRepository(),
  });
});
