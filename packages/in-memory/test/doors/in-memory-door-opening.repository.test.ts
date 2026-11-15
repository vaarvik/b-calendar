import { describeDoorOpeningRepositoryContract } from '@b-calendar/contracts/test-kit';
import {
  InMemoryCalendarRepository,
  InMemoryDoorOpeningRepository,
  InMemoryDoorRepository,
  InMemoryMemberRepository,
} from '@b-calendar/in-memory';

describeDoorOpeningRepositoryContract('InMemoryDoorOpeningRepository', () => {
  const doors = new InMemoryDoorRepository();
  const repository = new InMemoryDoorOpeningRepository(doors);
  return Promise.resolve({
    writer: repository,
    reader: repository,
    calendars: new InMemoryCalendarRepository(),
    doors,
    members: new InMemoryMemberRepository(),
  });
});
