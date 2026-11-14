import type {
  Calendar,
  CalendarDetails,
  CalendarDetailsResponseDto,
  CalendarVersionDto,
  CalendarVersionSummary,
  DoorComment,
  DoorCommentDto,
  CalendarDto,
  DoorPreview,
  DoorPreviewDto,
  OpenDoorOutput,
  OpenDoorResponseDto,
  RecipientCalendar,
  RecipientCalendarResponseDto,
} from '@b-calendar/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { HttpErrorResponse } from './shared.model.js';

/** One resource's routes. */
export interface HttpController {
  register(app: FastifyInstance): void;
}

/** Maps any thrown value to an HTTP response. */
export interface HttpErrorMapper {
  toResponse(error: unknown): HttpErrorResponse;
}

/** Builds and runs the HTTP API. */
export interface HttpServer {
  /** The configured app, ready for `inject` in tests. Built once. */
  app(): FastifyInstance;
  /** @returns the address it listens on. */
  listen(host: string, port: number): Promise<string>;
  close(): Promise<void>;
}

/** Lets admin requests through. */
export interface AdminRequestAuthenticator {
  /** @throws UnauthenticatedError when the request carries no valid admin session. */
  requireAdmin(request: FastifyRequest): void;
}

/** Turns database driver errors into domain errors. */
export interface DatabaseErrorTranslator {
  /** @returns a ConflictError for a unique violation, otherwise the error itself. */
  translate(error: unknown): unknown;
}

/** Runs a job over and over until stopped. */
export interface JobScheduler {
  start(): void;
  stop(): Promise<void>;
}

/** Turns use case output into wire DTOs: dates become ISO strings. */
export interface HttpDtoMapper {
  calendar(calendar: Calendar): CalendarDto;
  calendarDetails(details: CalendarDetails): CalendarDetailsResponseDto;
  calendarVersion(version: CalendarVersionSummary): CalendarVersionDto;
  comment(comment: DoorComment): DoorCommentDto;
  recipientCalendar(calendar: RecipientCalendar): RecipientCalendarResponseDto;
  openDoor(output: OpenDoorOutput): OpenDoorResponseDto;
  doorPreview(door: DoorPreview): DoorPreviewDto;
}
