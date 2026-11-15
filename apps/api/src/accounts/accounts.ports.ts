import type { IdentityProviderName } from '@b-calendar/contracts';
import type { JWTPayload } from 'jose';

/** What one provider's ID tokens mean: which issuer to expect, and who they name. */
export interface OidcClaimsMapper {
  readonly provider: IdentityProviderName;
  /**
   * @param discovered the issuer from the provider's discovery document.
   * @param claims the token's claims, not yet verified: only to pick the issuer template's tenant.
   */
  issuer(discovered: string, claims: JWTPayload): string;
  /** @returns null when the token does not name anyone usable. */
  identity(claims: JWTPayload): {
    readonly subject: string;
    readonly email: string | null;
    readonly name: string;
  } | null;
}
