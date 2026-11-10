import type { FastifyInstance } from 'fastify';
import type { HttpController } from './shared.ports.js';

export class HealthController implements HttpController {
  public register(app: FastifyInstance): void {
    app.get('/health', () => ({ status: 'ok' }));
  }
}
