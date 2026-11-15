import type { IdentityProviderName } from '@b-calendar/contracts';
import type { JWTPayload } from 'jose';
import type { OidcClaimsMapper } from './accounts.ports.js';

/** Google: one issuer, and an email counts only with `email_verified`. */
export class GoogleOidcClaimsMapper implements OidcClaimsMapper {
  public readonly provider: IdentityProviderName = 'google';

  public issuer(discovered: string): string {
    return discovered;
  }

  public identity(claims: JWTPayload) {
    if (typeof claims.sub !== 'string' || claims.sub === '') {
      return null;
    }
    const email =
      claims.email_verified === true && typeof claims.email === 'string' ? claims.email : null;
    const name = typeof claims.name === 'string' && claims.name !== '' ? claims.name : email;
    return { subject: claims.sub, email, name: name ?? 'Google-bruker' };
  }
}
