import { randomUUID } from 'node:crypto';
import type {
  AccountId,
  CalendarId,
  CommentId,
  DoorId,
  IdGenerator,
  MediaId,
  MemberId,
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

  public accountId(): AccountId {
    return randomUUID() as AccountId;
  }

  public commentId(): CommentId {
    return randomUUID() as CommentId;
  }

  public memberId(): MemberId {
    return randomUUID() as MemberId;
  }
}
