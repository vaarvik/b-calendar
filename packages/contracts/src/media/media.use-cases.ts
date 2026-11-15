import type { AccountId } from '../shared/shared.model.js';
import type { MediaKind } from './media.model.js';

export interface UploadMediaInput {
  readonly owner: AccountId;
  readonly contentType: string;
  /** The file as it arrives. */
  readonly chunks: AsyncIterable<Uint8Array>;
}

export interface UploadMediaOutput {
  /** `/media/<file>`, for a door's `imageUrl`, `audioUrl` or `videoUrl`. */
  readonly url: string;
  readonly kind: MediaKind;
}

/** An owner uploads a photo, a song or a video for a door. */
export interface UploadMedia {
  /**
   * @throws ValidationError when the type is not supported, or the file is empty or bigger than
   * its kind allows (`MAX_MEDIA_BYTES`); nothing is kept then.
   * @throws LimitExceededError when the owner's uploads would pass their limit; nothing is kept.
   */
  execute(input: UploadMediaInput): Promise<UploadMediaOutput>;
}
