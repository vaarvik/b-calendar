import {
  ConflictError,
  DomainError,
  DoorLockedError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from '@b-calendar/contracts';
import { describe, expect, it } from 'vitest';
import { DomainHttpErrorMapper } from '../../src/shared/domain-http-error.mapper.js';

describe('DomainHttpErrorMapper', () => {
  const mapper = new DomainHttpErrorMapper();

  it.each([
    [new ValidationError('bad', [{ path: ['a'], message: 'm' }]), 400],
    [new UnauthenticatedError(), 401],
    [new DoorLockedError(2, new Date(0)), 403],
    [new NotFoundError('Door', 'x'), 404],
    [new ConflictError('taken'), 409],
    [new DomainError('other', 'other'), 400],
    [Object.assign(new Error('Body too large'), { statusCode: 413 }), 413],
  ])('maps %o to %i', (error, status) => {
    const response = mapper.toResponse(error);

    expect(response.statusCode).toBe(status);
    expect(response.unexpected).toBe(false);
  });

  it.each([
    new Error('secret detail'),
    'a string',
    Object.assign(new Error('x'), { statusCode: 503 }),
    Object.assign(new Error('x'), { statusCode: '400' }),
  ])('hides anything else behind a 500: %o', (error) => {
    const response = mapper.toResponse(error);

    expect(response).toMatchObject({ statusCode: 500, unexpected: true });
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('uses a generic message for client errors that are not Errors', () => {
    expect(mapper.toResponse({ statusCode: 400 }).body).toEqual({
      error: { code: 'bad_request', message: 'Bad request.' },
    });
  });
});
