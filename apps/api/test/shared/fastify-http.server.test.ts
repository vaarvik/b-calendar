import type { FastifyInstance } from 'fastify';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { DomainHttpErrorMapper } from '../../src/shared/domain-http-error.mapper.js';
import { FastifyHttpServer } from '../../src/shared/fastify-http.server.js';
import { TestApi } from './test-api.js';

describe('FastifyHttpServer', () => {
  it('listens on a port and closes', async () => {
    const api = await TestApi.start();
    const address = await api.root.httpServer.listen('127.0.0.1', 0);

    const response = await fetch(`${address}/health`);

    expect(await response.json()).toEqual({ status: 'ok' });
    await api.close();
  });

  it('logs and hides unexpected errors', async () => {
    const server = new FastifyHttpServer(
      [
        {
          register(app: FastifyInstance) {
            app.get('/boom', () => {
              throw new Error('kaboom');
            });
          },
        },
      ],
      new DomainHttpErrorMapper(),
      pino({ level: 'silent' }),
      { bodyLimit: 1024, trustProxy: false },
    );

    const response = await server.app().inject({ url: '/boom' });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('kaboom');
    await server.close();
  });
});
