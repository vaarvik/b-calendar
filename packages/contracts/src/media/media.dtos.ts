import { z } from 'zod';
import { MEDIA_KINDS } from './media.model.js';
import type { MediaKind } from './media.model.js';

export interface UploadMediaResponseDto {
  readonly url: string;
  readonly kind: MediaKind;
}

export const UploadMediaResponseDtoSchema: z.ZodType<UploadMediaResponseDto> = z.object({
  url: z.string(),
  kind: z.enum(MEDIA_KINDS),
});
