import type { AdminCredentials, AdminSession } from './admin.model.js';

/** The admin signs in with the password from the server's configuration. */
export interface LogIn {
  /** @throws UnauthenticatedError when the password is wrong. */
  execute(input: AdminCredentials): Promise<AdminSession>;
}
