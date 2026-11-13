import type { MediaKind } from './media.model.js';

export interface UploadMediaInput {
  readonly contentType: string;
  /** The file as it arrives. */
  readonly chunks: AsyncIterable<Uint8Array>;
}

export interface UploadMediaOutput {
  /** `/media/<file>`, for a door's `imageUrl`, `audioUrl` or `videoUrl`. */
  readonly url: string;
  readonly kind: MediaKind;
}

/** An admin uploads a photo, a song or a video for a door. */
export interface UploadMedia {
  /**
   * @throws ValidationError when the type is not supported, or the file is empty or bigger than
   * its kind allows (`MAX_MEDIA_BYTES`); nothing is kept then.
   */
  execute(input: UploadMediaInput): Promise<UploadMediaOutput>;
}
