import { z } from 'zod';

/** A signed-in admin's bearer token. */
export interface AdminSession {
  readonly token: string;
  readonly expiresAt: Date;
}

export interface AdminCredentials {
  readonly password: string;
}

export const AdminCredentialsSchema: z.ZodType<AdminCredentials> = z.object({
  password: z.string().min(1).max(200),
});
