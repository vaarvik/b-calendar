import { NotFoundError } from '@b-calendar/contracts';
import type {
  Calendar,
  CalendarId,
  CalendarOwnerId,
  CalendarOwnershipChecker,
  CalendarReader,
  CommentId,
  DoorCommentReader,
  DoorId,
  DoorReader,
  DraftDoorReader,
  MemberId,
  MemberReader,
} from '@b-calendar/contracts';

/** Follows a door, member or comment to its calendar and compares the owner. */
export class LookupCalendarOwnershipChecker implements CalendarOwnershipChecker {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly drafts: DraftDoorReader,
    private readonly doors: DoorReader,
    private readonly members: MemberReader,
    private readonly comments: DoorCommentReader,
  ) {}

  public async calendar(owner: CalendarOwnerId, calendarId: CalendarId): Promise<Calendar> {
    const calendar = await this.calendars.getById(calendarId);
    if (calendar.ownerId !== owner) {
      // Like a calendar that does not exist, so nobody learns which ids are taken.
      throw new NotFoundError('Calendar', calendarId);
    }
    return calendar;
  }

  public async door(owner: CalendarOwnerId, doorId: DoorId): Promise<Calendar> {
    // A draft door and its published door share the id; either one leads to the calendar.
    const door = await this.drafts.getById(doorId).catch(async (error: unknown) => {
      if (error instanceof NotFoundError) {
        return this.doors.getById(doorId);
      }
      throw error;
    });
    return this.owned(owner, door.calendarId, 'Door', doorId);
  }

  public async member(owner: CalendarOwnerId, memberId: MemberId): Promise<Calendar> {
    const member = await this.members.getById(memberId);
    return this.owned(owner, member.calendarId, 'Member', memberId);
  }

  public async comment(owner: CalendarOwnerId, commentId: CommentId): Promise<Calendar> {
    const comment = await this.comments.getById(commentId);
    return this.door(owner, comment.doorId).catch((error: unknown) => {
      throw error instanceof NotFoundError ? new NotFoundError('DoorComment', commentId) : error;
    });
  }

  private async owned(
    owner: CalendarOwnerId,
    calendarId: CalendarId,
    entity: string,
    id: string,
  ): Promise<Calendar> {
    return this.calendar(owner, calendarId).catch((error: unknown) => {
      throw error instanceof NotFoundError ? new NotFoundError(entity, id) : error;
    });
  }
}
