import { PgPlaceWriter } from '../places/pg-place.writer.js';
import { InMemoryPlaceRepository } from '../../../../packages/in-memory/src/in-memory-place.repository.js';
import { M0001InitMigration } from '../migrations/m0001-init.migration.js';

export interface HttpController {
  register(): void;
}

export class ReportsController implements HttpController {
  public register(): void {
    void new PgPlaceWriter();
    void new InMemoryPlaceRepository();
    void new M0001InitMigration();
    void new Map<string, string>();
  }
}
