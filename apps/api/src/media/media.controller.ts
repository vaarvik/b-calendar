import { mkdirSync } from 'node:fs';
import { MAX_IMAGE_BYTES, UploadImageResponseDtoSchema } from '@b-calendar/contracts';
import type { UploadImage } from '@b-calendar/contracts';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import type { AdminRequestAuthenticator, HttpController } from '../shared/shared.ports.js';

export interface MediaControllerConfig {
  readonly directory: string;
}

/** Uploads (admin, raw image body) and serving `/media/<file>` (anyone with the URL). */
export class MediaController implements HttpController {
  public constructor(
    private readonly uploadImage: UploadImage,
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
      scope.addContentTypeParser(
        /^image\//,
        { parseAs: 'buffer', bodyLimit: MAX_IMAGE_BYTES + 1 },
        (_request, body, parsed) => {
          parsed(null, body);
        },
      );
      scope.post('/v1/admin/media', async (request, reply) => {
        this.admin.requireAdmin(request);
        const body = request.body;
        const output = await this.uploadImage.execute({
          contentType: (request.headers['content-type'] ?? '').split(';')[0]?.trim() ?? '',
          bytes: body instanceof Uint8Array ? body : new Uint8Array(),
        });
        return reply.status(201).send(UploadImageResponseDtoSchema.parse(output));
      });
      done();
    });
  }
}
