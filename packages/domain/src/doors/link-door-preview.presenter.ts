import type {
  Door,
  DoorLinkClassifier,
  DoorPreview,
  DoorPreviewPresenter,
} from '@b-calendar/contracts';

/** Everything about the door, plus its link as the recipient's player will show it. */
export class LinkDoorPreviewPresenter implements DoorPreviewPresenter {
  public constructor(private readonly links: DoorLinkClassifier) {}

  public preview(door: Door): DoorPreview {
    const { linkUrl } = door.content;
    return { ...door, link: linkUrl === null ? null : this.links.classify(linkUrl) };
  }
}
