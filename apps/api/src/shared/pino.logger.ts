import type { LogFields, Logger } from '@b-calendar/contracts';
import type { Logger as Pino } from 'pino';

export class PinoLogger implements Logger {
  public constructor(private readonly pino: Pino) {}

  public debug(message: string, fields: LogFields = {}): void {
    this.pino.debug(fields, message);
  }

  public info(message: string, fields: LogFields = {}): void {
    this.pino.info(fields, message);
  }

  public warn(message: string, fields: LogFields = {}): void {
    this.pino.warn(fields, message);
  }

  public error(message: string, fields: LogFields = {}): void {
    this.pino.error(fields, message);
  }
}
