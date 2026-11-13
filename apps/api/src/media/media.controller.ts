import { mkdirSync } from 'node:fs';
import { UploadMediaResponseDtoSchema } from '@b-calendar/contracts';
import type { UploadMedia } from '@b-calendar/contracts';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import type { AdminRequestAuthenticator, HttpController } from '../shared/shared.ports.js';

export interface MediaControllerConfig {
  readonly directory: string;
}

/**
 * Uploads (admin, the raw photo, song or video as the body, streamed to disk) and serving
 * `/media/<file>` (anyone with the URL; byte ranges, so phones can play and seek video).
 */
export class MediaController implements HttpController {
  public constructor(
    private readonly uploadMedia: UploadMedia,
    private readonly admin: AdminRequestAuthenticator,
    private readonly config: MediaControllerConfig,
  ) {}

  public register(app: FastifyInstance): void {
    mkdirSync(this.config.directory, { recursive: true });
    void app.register(fastifyStatic, {
      root: this.config.directory,
      prefix: '/media/',
      decorateReply: false,
      // File names are random and never reused.
      maxAge: '365d',
      immutable: true,
    });

    void app.register((scope, _options, done) => {
      // The body stays a stream: UploadMedia counts it against the kind's limit as it arrives.
      scope.addContentTypeParser(/^(image|audio|video)\//, (_request, payload, parsed) => {
        parsed(null, payload);
      });
      scope.post('/v1/admin/media', async (request, reply) => {
        this.admin.requireAdmin(request);
        const output = await this.uploadMedia.execute({
          contentType: (request.headers['content-type'] ?? '').split(';')[0]?.trim() ?? '',
          chunks: request.body as AsyncIterable<Uint8Array>,
        });
        return reply.status(201).send(UploadMediaResponseDtoSchema.parse(output));
      });
      done();
    });
  }
}
