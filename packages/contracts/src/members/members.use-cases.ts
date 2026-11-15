import type { CalendarId, MemberId } from '../shared/shared.model.js';
import type { Member } from './members.model.js';

export interface AddMemberInput {
  readonly calendarId: CalendarId;
  readonly name: string;
}

/** An admin adds a person to a calendar. They get their own link, with a fresh key. */
export interface AddMember {
  /**
   * @throws ValidationError when the name is empty or too long.
   * @throws NotFoundError when the calendar does not exist.
   * @throws LimitExceededError when the calendar has as many members as it may.
   */
  execute(input: AddMemberInput): Promise<Member>;
}

export interface RenameMemberInput {
  readonly memberId: MemberId;
  readonly name: string;
}

/** An admin changes a member's name. Comments already written keep the old one. */
export interface RenameMember {
  /**
   * @throws ValidationError when the name is empty or too long.
   * @throws NotFoundError when the member does not exist.
   */
  execute(input: RenameMemberInput): Promise<Member>;
}

/** A new key for one member's link: the old link stops working on every device. */
export interface RotateMemberKey {
  /** @throws NotFoundError when the member does not exist. */
  execute(input: { readonly memberId: MemberId }): Promise<Member>;
}

/** An admin removes a member: their link stops working. Their comments stay. */
export interface RemoveMember {
  /** @throws NotFoundError when the member does not exist. */
  execute(input: { readonly memberId: MemberId }): Promise<void>;
}
