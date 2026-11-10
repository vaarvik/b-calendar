import {
  CalendarAccessSchema,
  OpenDoorResponseDtoSchema,
  PushConfigResponseDtoSchema,
  RecipientCalendarResponseDtoSchema,
  SubscribeRequestDtoSchema,
  UnauthenticatedError,
} from '@b-calendar/contracts';
import type {
  CalendarAccess,
  InputValidator,
  OpenDoor,
  Subscribe,
  ViewCalendar,
} from '@b-calendar/contracts';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { HttpController, HttpDtoMapper } from '../shared/shared.ports.js';

export interface CalendarsControllerConfig {
  /** VAPID public key, or null when push is not configured. */
  readonly vapidPublicKey: string | null;
}

const SlugParamsSchema = z.object({ slug: z.string() });
const DoorParamsSchema = z.object({ slug: z.string(), number: z.coerce.number().int().min(1) });
const ManifestQuerySchema = z.object({ k: z.string().default('') });

/** The recipient's side. The access key travels in the `x-access-key` header. */
export class CalendarsController implements HttpController {
  public constructor(
    private readonly viewCalendar: ViewCalendar,
    private readonly openDoor: OpenDoor,
    private readonly subscribe: Subscribe,
    private readonly validator: InputValidator,
    private readonly dtos: HttpDtoMapper,
    private readonly config: CalendarsControllerConfig,
  ) {}

  public register(app: FastifyInstance): void {
    app.get('/v1/push/config', () =>
      PushConfigResponseDtoSchema.parse({ vapidPublicKey: this.config.vapidPublicKey }),
    );

    app.get('/v1/calendars/:slug', async (request, reply) => {
      const calendar = await this.viewCalendar.execute(this.access(request));
      return reply
        .header('cache-control', 'no-store')
        .send(RecipientCalendarResponseDtoSchema.parse(this.dtos.recipientCalendar(calendar)));
    });

    app.post('/v1/calendars/:slug/doors/:number/open', async (request, reply) => {
      const { number } = this.validator.validate(DoorParamsSchema, request.params);
      const output = await this.openDoor.execute({ ...this.access(request), number });
      return reply
        .header('cache-control', 'no-store')
        .send(OpenDoorResponseDtoSchema.parse(this.dtos.openDoor(output)));
    });

    app.post('/v1/calendars/:slug/subscriptions', async (request, reply) => {
      const endpoint = this.validator.validate(SubscribeRequestDtoSchema, request.body);
      await this.subscribe.execute({ ...this.access(request), endpoint });
      return reply.status(204).send();
    });

    // A manifest per calendar, so "Add to Home Screen" keeps the key in the start URL:
    // an installed web app on iOS does not share storage with Safari.
    app.get('/c/:slug/manifest.webmanifest', async (request, reply) => {
      const { slug } = this.validator.validate(SlugParamsSchema, request.params);
      const { k } = this.validator.validate(ManifestQuerySchema, request.query);
      let name = 'Kalender';
      try {
        name = (await this.viewCalendar.execute({ slug, accessKey: k })).title;
      } catch (error) {
        if (!(error instanceof UnauthenticatedError)) {
          throw error;
        }
      }
      const startUrl = `/c/${encodeURIComponent(slug)}?k=${encodeURIComponent(k)}`;
      return reply
        .type('application/manifest+json')
        .header('cache-control', 'no-store')
        .send({
          name,
          short_name: name,
          id: `/c/${slug}`,
          start_url: startUrl,
          scope: '/',
          display: 'standalone',
          background_color: '#1d1530',
          theme_color: '#1d1530',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        });
    });
  }

  private access(request: FastifyRequest): CalendarAccess {
    const { slug } = this.validator.validate(SlugParamsSchema, request.params);
    const header = request.headers['x-access-key'];
    const parsed = CalendarAccessSchema.safeParse({ slug, accessKey: header });
    if (!parsed.success) {
      throw new UnauthenticatedError('This link does not open a calendar.');
    }
    return parsed.data;
  }
}
