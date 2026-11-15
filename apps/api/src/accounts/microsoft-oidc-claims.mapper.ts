import type { IdentityProviderName } from '@b-calendar/contracts';
import type { JWTPayload } from 'jose';
import type { OidcClaimsMapper } from './accounts.ports.js';

/** The tenant of personal Microsoft accounts (outlook.com, hotmail.com, live.com). */
const CONSUMERS_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

/**
 * Microsoft (the `common` endpoint, personal and work accounts): the issuer names the account's
 * tenant, and the subject is per app and tenant. An email counts only from a personal account, or
 * when Entra vouches that the domain owner verified it (`xms_edov`); work accounts can otherwise
 * carry any address an admin typed in.
 */
export class MicrosoftOidcClaimsMapper implements OidcClaimsMapper {
  public readonly provider: IdentityProviderName = 'microsoft';

  public issuer(discovered: string, claims: JWTPayload): string {
    const tenant = typeof claims.tid === 'string' ? claims.tid : '';
    return discovered.replace('{tenantid}', tenant);
  }

  public identity(claims: JWTPayload) {
    if (typeof claims.sub !== 'string' || claims.sub === '' || typeof claims.tid !== 'string') {
      return null;
    }
    const verified = claims.tid === CONSUMERS_TENANT || claims.xms_edov === true;
    const email = verified && typeof claims.email === 'string' ? claims.email : null;
    const name = typeof claims.name === 'string' && claims.name !== '' ? claims.name : email;
    return {
      // The tenant keeps two tenants' equal subjects apart.
      subject: `${claims.tid}:${claims.sub}`,
      email,
      name: name ?? 'Microsoft-bruker',
    };
  }
}
