import { describeDoorCommentRepositoryContract } from '@b-calendar/contracts/test-kit';
import {
  InMemoryCalendarRepository,
  InMemoryDoorCommentRepository,
  InMemoryDoorRepository,
} from '@b-calendar/in-memory';

describeDoorCommentRepositoryContract('InMemoryDoorCommentRepository', () => {
  const repository = new InMemoryDoorCommentRepository();
  return Promise.resolve({
    writer: repository,
    reader: repository,
    calendars: new InMemoryCalendarRepository(),
    doors: new InMemoryDoorRepository(),
  });
});
