import { UnauthenticatedError } from '@b-calendar/contracts';
import type { AdminSessionService } from '@b-calendar/contracts';
import type { FastifyRequest } from 'fastify';
import type { AdminRequestAuthenticator } from '../shared/shared.ports.js';

export class BearerAdminAuthenticator implements AdminRequestAuthenticator {
  public constructor(private readonly sessions: AdminSessionService) {}

  public requireAdmin(request: FastifyRequest): void {
    const match = /^Bearer (\S+)$/.exec(request.headers.authorization ?? '');
    if (match?.[1] === undefined) {
      throw new UnauthenticatedError('Sign in first.');
    }
    this.sessions.verify(match[1]);
  }
}
