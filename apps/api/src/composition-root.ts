import {
  AddDoorUseCase,
  CreateCalendarUseCase,
  EditDoorUseCase,
  GetCalendarDetailsUseCase,
  KeyCalendarAccessAuthenticator,
  ListCalendarsUseCase,
  LogInUseCase,
  NotifyOpenedDoorsUseCase,
  OpenDoorUseCase,
  RemoveDoorUseCase,
  RotateCalendarKeyUseCase,
  SendTestNotificationUseCase,
  SubscribeUseCase,
  UpdateCalendarUseCase,
  UploadImageUseCase,
  ViewCalendarUseCase,
  ZodInputValidator,
} from '@b-calendar/application';
import type {
  CalendarReader,
  CalendarWriter,
  CreateCalendar,
  AddDoor,
  DoorReader,
  DoorWriter,
  Logger,
  NotifyOpenedDoors,
  PushSender,
  SubscriptionReader,
  SubscriptionWriter,
} from '@b-calendar/contracts';
import {
  ConstantTimeSecretMatcher,
  GraceWindowNotificationDecider,
  LinkDoorPreviewPresenter,
  OpensAtRecipientDoorPresenter,
  PathPushMessageFactory,
  UrlDoorLinkClassifier,
} from '@b-calendar/domain';
import {
  InMemoryCalendarRepository,
  InMemoryDoorRepository,
  InMemorySubscriptionRepository,
} from '@b-calendar/in-memory';
import { resolve } from 'node:path';
import { Kysely, PostgresDialect } from 'kysely';
import { Migrator } from 'kysely/migration';
import pg from 'pg';
import { pino } from 'pino';
import { z } from 'zod';
import { AdminController } from './admin/admin.controller.js';
import { BearerAdminAuthenticator } from './admin/bearer-admin.authenticator.js';
import { HmacAdminSessionService } from './admin/hmac-admin-session.service.js';
import { CalendarsController } from './calendars/calendars.controller.js';
import { PgCalendarRepository } from './calendars/pg-calendar.repository.js';
import { PgDoorRepository } from './doors/pg-door.repository.js';
import { DiskMediaStorage } from './media/disk-media.storage.js';
import { MediaController } from './media/media.controller.js';
import { AllMigrationsProvider } from './migrations/all-migrations.provider.js';
import { IntervalJobScheduler } from './notifications/interval-job.scheduler.js';
import { NullPushSender } from './notifications/null-push.sender.js';
import { WebPushSender } from './notifications/web-push.sender.js';
import { FastifyHttpServer } from './shared/fastify-http.server.js';
import { DomainHttpErrorMapper } from './shared/domain-http-error.mapper.js';
import { HealthController } from './shared/health.controller.js';
import { IsoHttpDtoMapper } from './shared/iso-http-dto.mapper.js';
import { PgDatabaseErrorTranslator } from './shared/pg-database-error.translator.js';
import { PinoLogger } from './shared/pino.logger.js';
import { RandomBytesSecretGenerator } from './shared/random-bytes-secret.generator.js';
import { RandomUuidIdGenerator } from './shared/random-uuid-id.generator.js';
import type { Database } from './shared/shared.model.js';
import type { HttpServer, JobScheduler } from './shared/shared.ports.js';
import { StaticWebController } from './shared/static-web.controller.js';
import { SystemClock } from './shared/system.clock.js';
import { PgSubscriptionRepository } from './subscriptions/pg-subscription.repository.js';

export interface PushConfig {
  readonly publicKey: string;
  readonly privateKey: string;
  readonly subject: string;
}

export interface ApiConfig {
  /** `memory` keeps everything in process; for tests and quick demos. */
  readonly storage: 'postgres' | 'memory';
  /** Required when storage is postgres. */
  readonly databaseUrl?: string;
  readonly adminPassword: string;
  readonly sessionSecret: string;
  /** Unset: notifications are not sent (and the app does not offer them). */
  readonly push?: PushConfig;
  readonly mediaDir: string;
  /** The web app's build to serve at `/`; unset serves the API only. */
  readonly webRoot?: string;
  readonly host: string;
  readonly port: number;
  readonly logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  readonly trustProxy: boolean;
  /** How often opened doors are checked for notifications. */
  readonly notifyIntervalSeconds: number;
  /** How late a door's notification may still go out. */
  readonly notifyGraceMinutes: number;
}

export const ApiConfigSchema: z.ZodType<ApiConfig> = z
  .object({
    storage: z.enum(['postgres', 'memory']).default('postgres'),
    databaseUrl: z.url({ protocol: /^postgres(ql)?$/ }).exactOptional(),
    adminPassword: z.string().min(12, 'ADMIN_PASSWORD needs at least 12 characters'),
    sessionSecret: z.string().min(32, 'SESSION_SECRET needs at least 32 characters'),
    push: z
      .object({
        publicKey: z.string().min(1),
        privateKey: z.string().min(1),
        subject: z.string().regex(/^(mailto:|https:\/\/)/),
      })
      .exactOptional(),
    // Static file serving needs absolute paths.
    mediaDir: z
      .string()
      .min(1)
      .default('data/media')
      .transform((path) => resolve(path)),
    webRoot: z
      .string()
      .min(1)
      .transform((path) => resolve(path))
      .exactOptional(),
    host: z.string().min(1).default('127.0.0.1'),
    port: z.coerce.number().int().min(0).max(65_535).default(3000),
    logLevel: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    trustProxy: z.stringbool().default(false),
    notifyIntervalSeconds: z.coerce.number().int().min(1).default(30),
    notifyGraceMinutes: z.coerce.number().int().min(1).default(180),
  })
  .refine((config) => config.storage === 'memory' || config.databaseUrl !== undefined, {
    message: 'DATABASE_URL is required when STORAGE is postgres',
    path: ['databaseUrl'],
  });

interface Storage {
  readonly calendars: CalendarReader & CalendarWriter;
  readonly doors: DoorReader & DoorWriter;
  readonly subscriptions: SubscriptionReader & SubscriptionWriter;
}

/**
 * The only place in the API allowed to construct application and infrastructure classes.
 * Everything is wired once in the constructor.
 */
export class CompositionRoot {
  public readonly httpServer: HttpServer;
  public readonly notifyOpenedDoors: NotifyOpenedDoors;
  public readonly createCalendar: CreateCalendar;
  public readonly addDoor: AddDoor;
  public readonly logger: Logger;
  private readonly scheduler: JobScheduler;
  private readonly db: Kysely<Database> | null;

  public constructor(private readonly config: ApiConfig) {
    const pinoLogger = pino({ level: config.logLevel });
    const logger = new PinoLogger(pinoLogger);
    this.logger = logger;
    const clock = new SystemClock();
    const ids = new RandomUuidIdGenerator();
    const secrets = new RandomBytesSecretGenerator();
    const matcher = new ConstantTimeSecretMatcher();
    const validator = new ZodInputValidator();
    const links = new UrlDoorLinkClassifier();
    const presenter = new OpensAtRecipientDoorPresenter(links);
    const previews = new LinkDoorPreviewPresenter(links);
    const messages = new PathPushMessageFactory();
    const dtos = new IsoHttpDtoMapper();

    this.db =
      config.storage === 'postgres'
        ? new Kysely<Database>({
            dialect: new PostgresDialect({
              pool: new pg.Pool({ connectionString: config.databaseUrl }),
            }),
          })
        : null;
    const { calendars, doors, subscriptions } =
      this.db === null ? this.inMemoryStorage() : this.postgresStorage(this.db);

    const push: PushSender =
      config.push === undefined
        ? new NullPushSender(logger)
        : new WebPushSender({ ...config.push, ttlSeconds: 6 * 3600 }, logger);
    const access = new KeyCalendarAccessAuthenticator(calendars, matcher);
    const sessions = new HmacAdminSessionService(
      { secret: config.sessionSecret, ttlHours: 30 * 24 },
      clock,
      matcher,
    );
    const admin = new BearerAdminAuthenticator(sessions);

    this.createCalendar = new CreateCalendarUseCase(calendars, ids, secrets, clock, validator);
    this.addDoor = new AddDoorUseCase(calendars, doors, previews, ids, validator);
    this.notifyOpenedDoors = new NotifyOpenedDoorsUseCase(
      doors,
      doors,
      calendars,
      subscriptions,
      subscriptions,
      push,
      new GraceWindowNotificationDecider({ graceMinutes: config.notifyGraceMinutes }),
      messages,
      clock,
      logger,
    );
    const notify = this.notifyOpenedDoors;
    this.scheduler = new IntervalJobScheduler(() => notify.execute(), logger, {
      name: 'NotifyOpenedDoors',
      intervalMs: config.notifyIntervalSeconds * 1000,
    });

    this.httpServer = new FastifyHttpServer(
      [
        new HealthController(),
        new CalendarsController(
          new ViewCalendarUseCase(access, doors, presenter, clock),
          new OpenDoorUseCase(access, doors, doors, presenter, clock),
          new SubscribeUseCase(access, subscriptions, ids, clock, validator),
          validator,
          dtos,
          { vapidPublicKey: config.push?.publicKey ?? null },
        ),
        new AdminController(
          {
            logIn: new LogInUseCase(sessions, matcher, { password: config.adminPassword }),
            listCalendars: new ListCalendarsUseCase(calendars),
            createCalendar: this.createCalendar,
            getCalendarDetails: new GetCalendarDetailsUseCase(
              calendars,
              doors,
              subscriptions,
              previews,
            ),
            updateCalendar: new UpdateCalendarUseCase(calendars, calendars, validator),
            rotateCalendarKey: new RotateCalendarKeyUseCase(calendars, calendars, secrets),
            addDoor: this.addDoor,
            editDoor: new EditDoorUseCase(doors, doors, previews, clock, validator),
            removeDoor: new RemoveDoorUseCase(doors),
            sendTestNotification: new SendTestNotificationUseCase(
              calendars,
              subscriptions,
              subscriptions,
              push,
              messages,
            ),
          },
          admin,
          validator,
          dtos,
        ),
        new MediaController(
          new UploadImageUseCase(new DiskMediaStorage({ directory: config.mediaDir }), ids),
          admin,
          { directory: config.mediaDir },
        ),
        ...(config.webRoot === undefined
          ? []
          : [new StaticWebController({ root: config.webRoot })]),
      ],
      new DomainHttpErrorMapper(),
      pinoLogger,
      { bodyLimit: 64 * 1024, trustProxy: config.trustProxy },
    );
  }

  public static fromEnv(env: NodeJS.ProcessEnv): CompositionRoot {
    return new CompositionRoot(CompositionRoot.configFromEnv(env));
  }

  /** Unset and empty variables are left out, so their defaults apply. */
  public static configFromEnv(env: NodeJS.ProcessEnv): ApiConfig {
    const push =
      env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
        ? {
            publicKey: env.VAPID_PUBLIC_KEY,
            privateKey: env.VAPID_PRIVATE_KEY,
            subject: env.VAPID_SUBJECT ?? '',
          }
        : undefined;
    const values = {
      storage: env.STORAGE,
      databaseUrl: env.DATABASE_URL,
      adminPassword: env.ADMIN_PASSWORD,
      sessionSecret: env.SESSION_SECRET,
      push,
      mediaDir: env.MEDIA_DIR,
      webRoot: env.WEB_ROOT,
      host: env.HOST,
      port: env.PORT,
      logLevel: env.LOG_LEVEL,
      trustProxy: env.TRUST_PROXY,
      notifyIntervalSeconds: env.NOTIFY_INTERVAL_SECONDS,
      notifyGraceMinutes: env.NOTIFY_GRACE_MINUTES,
    };
    return ApiConfigSchema.parse(
      Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined && value !== ''),
      ),
    );
  }

  /** Serves HTTP and sends notifications. Postgres must be migrated first (migrate.ts). */
  public async start(): Promise<void> {
    await this.httpServer.listen(this.config.host, this.config.port);
    this.scheduler.start();
  }

  public migrator(): Migrator {
    if (this.db === null) {
      throw new Error('Migrations need STORAGE=postgres.');
    }
    return new Migrator({ db: this.db, provider: new AllMigrationsProvider() });
  }

  public async close(): Promise<void> {
    await this.scheduler.stop();
    await this.httpServer.close();
    await this.db?.destroy();
  }

  private inMemoryStorage(): Storage {
    return {
      calendars: new InMemoryCalendarRepository(),
      doors: new InMemoryDoorRepository(),
      subscriptions: new InMemorySubscriptionRepository(),
    };
  }

  private postgresStorage(db: Kysely<Database>): Storage {
    const errors = new PgDatabaseErrorTranslator();
    return {
      calendars: new PgCalendarRepository(db, errors),
      doors: new PgDoorRepository(db, errors),
      subscriptions: new PgSubscriptionRepository(db),
    };
  }
}
