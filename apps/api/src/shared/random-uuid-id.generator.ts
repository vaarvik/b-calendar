import { randomUUID } from 'node:crypto';
import type {
  CalendarId,
  DoorId,
  IdGenerator,
  MediaId,
  SubscriptionId,
} from '@b-calendar/contracts';

export class RandomUuidIdGenerator implements IdGenerator {
  public calendarId(): CalendarId {
    return randomUUID() as CalendarId;
  }

  public doorId(): DoorId {
    return randomUUID() as DoorId;
  }

  public subscriptionId(): SubscriptionId {
    return randomUUID() as SubscriptionId;
  }

  public mediaId(): MediaId {
    return randomUUID() as MediaId;
  }
}
