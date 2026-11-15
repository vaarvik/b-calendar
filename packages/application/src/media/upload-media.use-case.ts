import {
  LimitExceededError,
  MAX_MEDIA_BYTES,
  MEDIA_TYPES,
  ValidationError,
} from '@b-calendar/contracts';
import type {
  AccountLimits,
  Clock,
  IdGenerator,
  MediaContentType,
  MediaFileReader,
  MediaFileWriter,
  MediaStorage,
  UploadMedia,
  UploadMediaInput,
  UploadMediaOutput,
} from '@b-calendar/contracts';

export class UploadMediaUseCase implements UploadMedia {
  public constructor(
    private readonly storage: MediaStorage,
    private readonly fileReader: MediaFileReader,
    private readonly fileWriter: MediaFileWriter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly limits: AccountLimits,
  ) {}

  public async execute(input: UploadMediaInput): Promise<UploadMediaOutput> {
    const { contentType } = input;
    if (!this.isSupported(contentType)) {
      throw new ValidationError(`${contentType} is not a supported photo, song or video type.`);
    }
    const { kind } = MEDIA_TYPES[contentType];
    const used = (await this.fileReader.listByOwner(input.owner)).reduce(
      (sum, file) => sum + file.bytes,
      0,
    );
    const left = this.limits.mediaBytes - used;
    if (left <= 0) {
      throw new LimitExceededError('mediaBytes', this.limits.mediaBytes);
    }
    const id = this.ids.mediaId();
    const counted = { bytes: 0 };
    const url = await this.storage.save(
      id,
      contentType,
      this.limited(input.chunks, MAX_MEDIA_BYTES[kind], left, counted),
    );
    await this.fileWriter.create({
      id,
      ownerId: input.owner,
      contentType,
      bytes: counted.bytes,
      createdAt: this.clock.now(),
    });
    return { url, kind };
  }

  private isSupported(contentType: string): contentType is MediaContentType {
    return Object.hasOwn(MEDIA_TYPES, contentType);
  }

  /**
   * Passes the chunks on, counting them, and fails the upload once it is too big for its kind or
   * for what the owner has left, or ends empty.
   */
  private async *limited(
    chunks: AsyncIterable<Uint8Array>,
    maxBytes: number,
    left: number,
    counted: { bytes: number },
  ): AsyncIterable<Uint8Array> {
    for await (const chunk of chunks) {
      counted.bytes += chunk.length;
      if (counted.bytes > maxBytes) {
        throw new ValidationError(
          `The file is bigger than ${String(Math.round(maxBytes / 1024 / 1024))} MB.`,
        );
      }
      if (counted.bytes > left) {
        throw new LimitExceededError('mediaBytes', this.limits.mediaBytes);
      }
      yield chunk;
    }
    if (counted.bytes === 0) {
      throw new ValidationError('The file is empty.');
    }
  }
}
