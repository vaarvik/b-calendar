import { IMAGE_TYPES, MAX_IMAGE_BYTES, ValidationError } from '@b-calendar/contracts';
import type {
  IdGenerator,
  ImageContentType,
  MediaStorage,
  UploadImage,
  UploadImageInput,
  UploadImageOutput,
} from '@b-calendar/contracts';

export class UploadImageUseCase implements UploadImage {
  public constructor(
    private readonly storage: MediaStorage,
    private readonly ids: IdGenerator,
  ) {}

  public async execute(input: UploadImageInput): Promise<UploadImageOutput> {
    if (!this.isImageType(input.contentType)) {
      throw new ValidationError(`${input.contentType} is not a supported image type.`);
    }
    if (input.bytes.length === 0 || input.bytes.length > MAX_IMAGE_BYTES) {
      throw new ValidationError('The image is empty or too big.');
    }
    const url = await this.storage.save(this.ids.mediaId(), input.contentType, input.bytes);
    return { url };
  }

  private isImageType(contentType: string): contentType is ImageContentType {
    return Object.hasOwn(IMAGE_TYPES, contentType);
  }
}
