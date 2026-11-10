import { stat } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import type { HttpController } from './shared.ports.js';

export interface StaticWebControllerConfig {
  /** The web app's build (apps/web/dist). */
  readonly root: string;
}

/**
 * Serves the web app from the API's own origin: files as they are, every other page path as the
 * single-page app's index.html. `/v1` and `/media` keep their own 404s.
 */
export class StaticWebController implements HttpController {
  public constructor(private readonly config: StaticWebControllerConfig) {}

  public register(app: FastifyInstance): void {
    void app.register(fastifyStatic, { root: this.config.root, serve: false });

    app.get('/*', async (request, reply) => {
      const path = decodeURIComponent(request.url.split('?')[0] ?? '/');
      if (/^\/(v1|media)(\/|$)/.test(path)) {
        return reply.status(404).send({
          error: { code: 'not_found', message: `No route for GET ${path}.` },
        });
      }
      const file = (await this.resolve(path)) ?? 'index.html';
      // Vite puts content hashes in asset names; pages and the service worker must stay fresh.
      const immutable = file.startsWith('assets/');
      return reply
        .header('cache-control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache')
        .sendFile(file, { cacheControl: false });
    });
  }

  private async resolve(path: string): Promise<string | null> {
    const clean = normalize(path).replace(/^[/\\]+/, '');
    if (clean === '' || clean.split(sep).includes('..')) {
      return null;
    }
    try {
      return (await stat(join(this.config.root, clean))).isFile() ? clean : null;
    } catch {
      return null;
    }
  }
}
