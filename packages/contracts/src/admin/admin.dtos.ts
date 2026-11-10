import { z } from 'zod';

export interface LogInResponseDto {
  readonly token: string;
  readonly expiresAt: string;
}

export const LogInResponseDtoSchema: z.ZodType<LogInResponseDto> = z.object({
  token: z.string(),
  expiresAt: z.string(),
});
