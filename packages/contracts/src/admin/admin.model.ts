import { z } from 'zod';

export interface AdminCredentials {
  readonly password: string;
}

export const AdminCredentialsSchema: z.ZodType<AdminCredentials> = z.object({
  password: z.string().min(1).max(200),
});
