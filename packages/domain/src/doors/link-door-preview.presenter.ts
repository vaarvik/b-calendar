import type {
  Door,
  DoorLinkClassifier,
  DoorOpening,
  DoorPreview,
  DoorPreviewPresenter,
} from '@b-calendar/contracts';

/** Everything about the door, its link as the players will show it, and who has opened it. */
export class LinkDoorPreviewPresenter implements DoorPreviewPresenter {
  public constructor(private readonly links: DoorLinkClassifier) {}

  public preview(door: Door, openings: readonly DoorOpening[]): DoorPreview {
    const { linkUrl } = door.content;
    return {
      ...door,
      link: linkUrl === null ? null : this.links.classify(linkUrl),
      openings: openings.filter((opening) => opening.doorId === door.id),
    };
  }
}
