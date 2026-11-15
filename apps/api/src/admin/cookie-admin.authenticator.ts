import { UnauthenticatedError } from '@b-calendar/contracts';
import type { AccountSessionService, CalendarOwnerId } from '@b-calendar/contracts';
import type { FastifyRequest } from 'fastify';
import { SESSION_COOKIE } from '../shared/shared.model.js';
import type { AdminRequestAuthenticator } from '../shared/shared.ports.js';

/**
 * The session lives in an HttpOnly cookie. A request that changes something must also carry
 * `x-requested-with: b-calendar`, which a form or link on another site cannot add (CSRF), on top
 * of the cookie's SameSite=Lax.
 */
export class CookieAdminAuthenticator implements AdminRequestAuthenticator {
  public constructor(private readonly sessions: AccountSessionService) {}

  public requireAdmin(request: FastifyRequest): CalendarOwnerId {
    const token = request.cookies[SESSION_COOKIE];
    if (token === undefined || token === '') {
      throw new UnauthenticatedError('Sign in first.');
    }
    if (
      !['GET', 'HEAD'].includes(request.method) &&
      request.headers['x-requested-with'] !== 'b-calendar'
    ) {
      throw new UnauthenticatedError('Missing the request header.');
    }
    return this.sessions.verify(token);
  }
}
