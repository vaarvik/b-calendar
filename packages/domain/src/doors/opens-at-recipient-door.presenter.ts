import type {
  Door,
  DoorContent,
  DoorLinkClassifier,
  OpenDoorContent,
  RecipientDoor,
  RecipientDoorPresenter,
} from '@b-calendar/contracts';

/** Locked until `opensAt`, ready after it, opened for good once she has looked. */
export class OpensAtRecipientDoorPresenter implements RecipientDoorPresenter {
  public constructor(private readonly links: DoorLinkClassifier) {}

  public present(door: Door, now: Date): RecipientDoor {
    const { number, opensAt, featured } = door;
    if (opensAt.getTime() > now.getTime()) {
      return { state: 'locked', number, opensAt, featured };
    }
    if (door.firstOpenedAt === null) {
      return { state: 'ready', number, opensAt, featured };
    }
    return { state: 'opened', number, opensAt, featured, content: this.content(door.content) };
  }

  public content(content: DoorContent): OpenDoorContent {
    const { linkUrl, ...rest } = content;
    return { ...rest, link: linkUrl === null ? null : this.links.classify(linkUrl) };
  }
}
