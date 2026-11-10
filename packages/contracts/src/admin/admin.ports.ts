import type { AdminSession } from './admin.model.js';

/** Issues and verifies admin session tokens. There is one admin; the token names no one. */
export interface AdminSessionService {
  issue(): AdminSession;
  /** @throws UnauthenticatedError when the token is malformed, forged or expired. */
  verify(token: string): void;
}
