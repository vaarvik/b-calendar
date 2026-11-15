import { z } from 'zod';
import { IDENTITY_PROVIDERS } from './accounts.model.js';
import type { IdentityProviderName } from './accounts.model.js';

/** How one can sign in here. */
export interface AuthConfigResponseDto {
  readonly providers: readonly IdentityProviderName[];
  /** Whether the old admin password still works. */
  readonly password: boolean;
}

export const AuthConfigResponseDtoSchema: z.ZodType<AuthConfigResponseDto> = z.object({
  providers: z.array(z.enum(IDENTITY_PROVIDERS)),
  password: z.boolean(),
});

/** Who is signed in; `account` is null for the old admin password. */
export interface MeResponseDto {
  readonly account: { readonly name: string; readonly email: string | null } | null;
}

export const MeResponseDtoSchema: z.ZodType<MeResponseDto> = z.object({
  account: z.object({ name: z.string(), email: z.string().nullable() }).nullable(),
});
