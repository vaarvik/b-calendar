import Fastify from 'fastify';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import type { HttpController, HttpErrorMapper, HttpServer } from './shared.ports.js';

export interface FastifyHttpServerConfig {
  /** Max JSON body size in bytes. Uploads set their own limit. */
  readonly bodyLimit: number;
  /** Trust X-Forwarded-* from a proxy in front of the API. */
  readonly trustProxy: boolean;
}

export class FastifyHttpServer implements HttpServer {
  private instance: FastifyInstance | undefined;

  public constructor(
    private readonly controllers: readonly HttpController[],
    private readonly errors: HttpErrorMapper,
    private readonly logger: FastifyBaseLogger,
    private readonly options: FastifyHttpServerConfig,
  ) {}

  public app(): FastifyInstance {
    this.instance ??= this.build();
    return this.instance;
  }

  public listen(host: string, port: number): Promise<string> {
    return this.app().listen({ host, port });
  }

  public async close(): Promise<void> {
    await this.instance?.close();
  }

  private build(): FastifyInstance {
    const app = Fastify({
      loggerInstance: this.logger,
      bodyLimit: this.options.bodyLimit,
      trustProxy: this.options.trustProxy,
    });
    app.setErrorHandler((error, request, reply) => {
      const response = this.errors.toResponse(error);
      if (response.unexpected) {
        request.log.error({ err: error }, 'Unhandled error');
      }
      return reply.status(response.statusCode).headers(response.headers).send(response.body);
    });
    app.setNotFoundHandler((request, reply) =>
      reply.status(404).send({
        error: { code: 'not_found', message: `No route for ${request.method} ${request.url}.` },
      }),
    );
    for (const controller of this.controllers) {
      controller.register(app);
    }
    return app;
  }
}
