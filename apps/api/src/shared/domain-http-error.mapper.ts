import {
  ConflictError,
  DomainError,
  DoorLockedError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from '@b-calendar/contracts';
import type { ErrorResponseDto } from '@b-calendar/contracts';
import type { HttpErrorResponse } from './shared.model.js';
import type { HttpErrorMapper } from './shared.ports.js';

/** Typed domain errors to status codes. Everything else is a 500 that hides its details. */
export class DomainHttpErrorMapper implements HttpErrorMapper {
  public toResponse(error: unknown): HttpErrorResponse {
    if (error instanceof ValidationError) {
      return this.response(400, error, {
        issues: error.issues.map((issue) => ({ path: [...issue.path], message: issue.message })),
      });
    }
    if (error instanceof UnauthenticatedError) {
      return this.response(401, error);
    }
    if (error instanceof DoorLockedError) {
      return this.response(403, error);
    }
    if (error instanceof NotFoundError) {
      return this.response(404, error);
    }
    if (error instanceof ConflictError) {
      return this.response(409, error);
    }
    if (error instanceof DomainError) {
      return this.response(400, error);
    }
    const status = this.fastifyStatus(error);
    if (status !== null) {
      const message = error instanceof Error ? error.message : 'Bad request.';
      return {
        statusCode: status,
        headers: {},
        body: this.body('bad_request', message),
        unexpected: false,
      };
    }
    return {
      statusCode: 500,
      headers: {},
      body: this.body('internal', 'Something went wrong.'),
      unexpected: true,
    };
  }

  private response(statusCode: number, error: DomainError, extra: object = {}): HttpErrorResponse {
    return {
      statusCode,
      headers: {},
      body: { error: { code: error.code, message: error.message, ...extra } },
      unexpected: false,
    };
  }

  private body(code: string, message: string): ErrorResponseDto {
    return { error: { code, message } };
  }

  /** Fastify's own client errors (malformed JSON, body too large) carry a 4xx statusCode. */
  private fastifyStatus(error: unknown): number | null {
    if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
      return null;
    }
    const { statusCode } = error;
    return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500
      ? statusCode
      : null;
  }
}
