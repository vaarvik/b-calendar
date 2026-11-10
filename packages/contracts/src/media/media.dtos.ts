import { z } from 'zod';

export interface UploadImageResponseDto {
  readonly url: string;
}

export const UploadImageResponseDtoSchema: z.ZodType<UploadImageResponseDto> = z.object({
  url: z.string(),
});
