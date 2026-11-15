import type { AccountSession } from '../accounts/accounts.model.js';
import type { AdminCredentials } from './admin.model.js';

/**
 * The old way in: the admin password from the server's configuration, while it is set. It opens
 * the calendars nobody owns yet, until their owner signs in with SSO and claims them.
 */
export interface LogIn {
  /** @throws UnauthenticatedError when the password is wrong or no longer in use. */
  execute(input: AdminCredentials): Promise<AccountSession>;
}
