import { MAX_MEDIA_BYTES, MEDIA_TYPES, ValidationError } from '@b-calendar/contracts';
import type {
  IdGenerator,
  MediaContentType,
  MediaStorage,
  UploadMedia,
  UploadMediaInput,
  UploadMediaOutput,
} from '@b-calendar/contracts';

export class UploadMediaUseCase implements UploadMedia {
  public constructor(
    private readonly storage: MediaStorage,
    private readonly ids: IdGenerator,
  ) {}

  public async execute(input: UploadMediaInput): Promise<UploadMediaOutput> {
    const { contentType } = input;
    if (!this.isSupported(contentType)) {
      throw new ValidationError(`${contentType} is not a supported photo, song or video type.`);
    }
    const { kind } = MEDIA_TYPES[contentType];
    const url = await this.storage.save(
      this.ids.mediaId(),
      contentType,
      this.limited(input.chunks, MAX_MEDIA_BYTES[kind]),
    );
    return { url, kind };
  }

  private isSupported(contentType: string): contentType is MediaContentType {
    return Object.hasOwn(MEDIA_TYPES, contentType);
  }

  /** Passes the chunks on, and fails the upload once it is too big or ends empty. */
  private async *limited(
    chunks: AsyncIterable<Uint8Array>,
    maxBytes: number,
  ): AsyncIterable<Uint8Array> {
    let total = 0;
    for await (const chunk of chunks) {
      total += chunk.length;
      if (total > maxBytes) {
        throw new ValidationError(
          `The file is bigger than ${String(Math.round(maxBytes / 1024 / 1024))} MB.`,
        );
      }
      yield chunk;
    }
    if (total === 0) {
      throw new ValidationError('The file is empty.');
    }
  }
}
