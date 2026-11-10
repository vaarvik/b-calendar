export interface UploadImageInput {
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

export interface UploadImageOutput {
  /** `/media/<file>`, for a door's `imageUrl`. */
  readonly url: string;
}

/** An admin uploads a picture for a door. */
export interface UploadImage {
  /** @throws ValidationError when the type is not an image type or the file is too big or empty. */
  execute(input: UploadImageInput): Promise<UploadImageOutput>;
}
