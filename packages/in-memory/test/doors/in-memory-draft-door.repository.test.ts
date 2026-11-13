import { describeDraftDoorRepositoryContract } from '@b-calendar/contracts/test-kit';
import { InMemoryCalendarRepository, InMemoryDraftDoorRepository } from '@b-calendar/in-memory';

describeDraftDoorRepositoryContract('InMemoryDraftDoorRepository', () => {
  const repository = new InMemoryDraftDoorRepository();
  return Promise.resolve({
    writer: repository,
    reader: repository,
    calendars: new InMemoryCalendarRepository(),
  });
});
