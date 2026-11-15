import {
  AddDoorCommentUseCase,
  AddGiverDoorCommentUseCase,
  AddDoorUseCase,
  AddMemberUseCase,
  CompleteSignInUseCase,
  CreateCalendarUseCase,
  GetMeUseCase,
  ListIdentityProvidersUseCase,
  LookupCalendarOwnershipChecker,
  StartSignInUseCase,
  EditDoorUseCase,
  GetCalendarDetailsUseCase,
  KeyCalendarAccessAuthenticator,
  ListAdminDoorCommentsUseCase,
  ListCalendarsUseCase,
  ListDoorCommentsUseCase,
  PushCommentNotifier,
  RemoveDoorCommentUseCase,
  VisibleOpenedDoorLocator,
  PublishCalendarUseCase,
  NotifyOpenedDoorsUseCase,
  OpenDoorUseCase,
  RemoveDoorUseCase,
  RemoveMemberUseCase,
  RenameMemberUseCase,
  RotateCalendarKeyUseCase,
  RotateMemberKeyUseCase,
  SendTestNotificationUseCase,
  SubscribeUseCase,
  UpdateCalendarUseCase,
  UploadMediaUseCase,
  ViewCalendarUseCase,
  ZodInputValidator,
} from '@b-calendar/application';
import type {
  AccountLimits,
  AccountReader,
  AccountWriter,
  MediaFileReader,
  MediaFileWriter,
  AddMember,
  DoorOpeningReader,
  DoorOpeningWriter,
  MemberReader,
  MemberWriter,
  CalendarVersionReader,
  CalendarVersionWriter,
  DoorCommentReader,
  DoorCommentWriter,
  DraftDoorReader,
  DraftDoorWriter,
  PublishCalendar,
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
  NumberedDraftDoorPresenter,
  OpensAtDoorNumberCalculator,
  ConstantTimeSecretMatcher,
  GraceWindowNotificationDecider,
  LinkDoorPreviewPresenter,
  OpensAtRecipientDoorPresenter,
  PathPushMessageFactory,
  UrlDoorLinkClassifier,
  ZonedDoorScheduleCalculator,
} from '@b-calendar/domain';
import {
  InMemoryAccountRepository,
  InMemoryMediaFileRepository,
  InMemoryCalendarRepository,
  InMemoryCalendarVersionRepository,
  InMemoryDoorCommentRepository,
  InMemoryDoorOpeningRepository,
  InMemoryDraftDoorRepository,
  InMemoryDoorRepository,
  InMemoryMemberRepository,
  InMemorySubscriptionRepository,
} from '@b-calendar/in-memory';
import { resolve } from 'node:path';
import { Kysely, PostgresDialect } from 'kysely';
import { Migrator } from 'kysely/migration';
import pg from 'pg';
import { pino } from 'pino';
import { z } from 'zod';
import { AuthController } from './accounts/auth.controller.js';
import { GoogleOidcClaimsMapper } from './accounts/google-oidc-claims.mapper.js';
import { HmacAccountSessionService } from './accounts/hmac-account-session.service.js';
import { HmacSignInChallengeSealer } from './accounts/hmac-sign-in-challenge.sealer.js';
import { MicrosoftOidcClaimsMapper } from './accounts/microsoft-oidc-claims.mapper.js';
import { OidcIdentityProvider } from './accounts/oidc-identity.provider.js';
import { PgAccountRepository } from './accounts/pg-account.repository.js';
import { AdminController } from './admin/admin.controller.js';
import { CookieAdminAuthenticator } from './admin/cookie-admin.authenticator.js';
import { PgMediaFileRepository } from './media/pg-media-file.repository.js';
import { CalendarsController } from './calendars/calendars.controller.js';
import { PgCalendarVersionRepository } from './calendars/pg-calendar-version.repository.js';
import { PgCalendarRepository } from './calendars/pg-calendar.repository.js';
import { CommentsController } from './comments/comments.controller.js';
import { PgDoorCommentRepository } from './comments/pg-door-comment.repository.js';
import { PgDoorOpeningRepository } from './doors/pg-door-opening.repository.js';
import { PgDoorRepository } from './doors/pg-door.repository.js';
import { PgDraftDoorRepository } from './doors/pg-draft-door.repository.js';
import { DiskMediaStorage } from './media/disk-media.storage.js';
import { MediaController } from './media/media.controller.js';
import { MembersController } from './members/members.controller.js';
import { PgMemberRepository } from './members/pg-member.repository.js';
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

/** An app registered with an OpenID Connect provider. */
export interface OidcClientConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  /** The provider's `/.well-known/openid-configuration`; each provider has its default. */
  readonly discoveryUrl: string;
}

export interface ApiConfig {
  /** `memory` keeps everything in process; for tests and quick demos. */
  readonly storage: 'postgres' | 'memory';
  /** Required when storage is postgres. */
  readonly databaseUrl?: string;
  readonly sessionSecret: string;
  /** Where the site is reached, e.g. `https://calendar.johann.no`: for SSO callbacks and cookies. */
  readonly publicOrigin: string;
  /** The SSO providers set up; one without config does not show. */
  readonly google?: OidcClientConfig;
  readonly microsoft?: OidcClientConfig;
  readonly limits: AccountLimits;
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
    // node-postgres reads sslmode=require as verify-full, which rejects a cluster database's
    // self-signed certificate. libpq (and whoever wrote the URL) means "encrypt, don't verify".
    databaseUrl: z
      .url({ protocol: /^postgres(ql)?$/ })
      .transform((url) =>
        /[?&]sslmode=/.test(url) && !/[?&]uselibpqcompat=/.test(url)
          ? `${url}&uselibpqcompat=true`
          : url,
      )
      .exactOptional(),
    sessionSecret: z.string().min(32, 'SESSION_SECRET needs at least 32 characters'),
    publicOrigin: z
      .url({ protocol: /^https?$/ })
      .default('http://localhost:3000')
      .transform((url) => url.replace(/\/+$/, '')),
    google: z
      .object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        discoveryUrl: z
          .url()
          .default('https://accounts.google.com/.well-known/openid-configuration'),
      })
      .exactOptional(),
    microsoft: z
      .object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        discoveryUrl: z
          .url()
          .default(
            'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
          ),
      })
      .exactOptional(),
    limits: z
      .object({
        calendars: z.coerce.number().int().min(1).default(5),
        mediaBytes: z.coerce
          .number()
          .int()
          .min(1)
          .default(500 * 1024 * 1024),
        membersPerCalendar: z.coerce.number().int().min(1).default(30),
      })
      .default({ calendars: 5, mediaBytes: 500 * 1024 * 1024, membersPerCalendar: 30 }),
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
  readonly drafts: DraftDoorReader & DraftDoorWriter;
  readonly versions: CalendarVersionReader & CalendarVersionWriter;
  readonly comments: DoorCommentReader & DoorCommentWriter;
  readonly subscriptions: SubscriptionReader & SubscriptionWriter;
  readonly members: MemberReader & MemberWriter;
  readonly openings: DoorOpeningReader & DoorOpeningWriter;
  readonly accounts: AccountReader & AccountWriter;
  readonly mediaFiles: MediaFileReader & MediaFileWriter;
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
  public readonly publishCalendar: PublishCalendar;
  public readonly addMember: AddMember;
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
    const schedule = new ZonedDoorScheduleCalculator();

    this.db =
      config.storage === 'postgres'
        ? new Kysely<Database>({
            dialect: new PostgresDialect({
              pool: new pg.Pool({ connectionString: config.databaseUrl }),
            }),
          })
        : null;
    const {
      calendars,
      doors,
      drafts,
      versions,
      comments,
      subscriptions,
      members,
      openings,
      accounts,
      mediaFiles,
    } = this.db === null ? this.inMemoryStorage() : this.postgresStorage(this.db);

    const push: PushSender =
      config.push === undefined
        ? new NullPushSender(logger)
        : new WebPushSender({ ...config.push, ttlSeconds: 6 * 3600 }, logger);
    const access = new KeyCalendarAccessAuthenticator(calendars, members, matcher);
    const sessions = new HmacAccountSessionService(
      { secret: config.sessionSecret, ttlHours: 30 * 24 },
      clock,
      matcher,
    );
    const admin = new CookieAdminAuthenticator(sessions);
    const ownership = new LookupCalendarOwnershipChecker(
      calendars,
      drafts,
      doors,
      members,
      comments,
    );
    const identityProviders = [
      ...(config.google === undefined
        ? []
        : [new OidcIdentityProvider(new GoogleOidcClaimsMapper(), config.google)]),
      ...(config.microsoft === undefined
        ? []
        : [new OidcIdentityProvider(new MicrosoftOidcClaimsMapper(), config.microsoft)]),
    ];
    const sealer = new HmacSignInChallengeSealer({ secret: config.sessionSecret }, clock, matcher);
    const callbackUrl = (provider: string) =>
      `${config.publicOrigin}/v1/auth/${encodeURIComponent(provider)}/callback`;
    const openedDoors = new VisibleOpenedDoorLocator(access, doors, presenter, clock);
    const commentNotifier = new PushCommentNotifier(
      subscriptions,
      subscriptions,
      push,
      messages,
      logger,
    );

    this.createCalendar = new CreateCalendarUseCase(
      calendars,
      calendars,
      ids,
      secrets,
      clock,
      validator,
      config.limits,
    );
    const draftPresenter = new NumberedDraftDoorPresenter(
      schedule,
      new OpensAtDoorNumberCalculator(),
      previews,
    );
    this.addDoor = new AddDoorUseCase(
      calendars,
      drafts,
      drafts,
      doors,
      openings,
      draftPresenter,
      ids,
      clock,
      validator,
    );
    this.addMember = new AddMemberUseCase(
      calendars,
      members,
      members,
      ids,
      secrets,
      clock,
      validator,
      config.limits,
    );
    this.publishCalendar = new PublishCalendarUseCase(
      calendars,
      drafts,
      doors,
      doors,
      versions,
      versions,
      draftPresenter,
      clock,
    );
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
          new ViewCalendarUseCase(access, doors, openings, presenter, clock),
          new OpenDoorUseCase(openedDoors, openings, openings, presenter, clock),
          new SubscribeUseCase(access, subscriptions, ids, clock, validator),
          validator,
          dtos,
          { vapidPublicKey: config.push?.publicKey ?? null },
        ),
        new AuthController(
          {
            startSignIn: new StartSignInUseCase(identityProviders, sealer, secrets, clock, {
              callbackUrl,
              challengeMinutes: 15,
            }),
            completeSignIn: new CompleteSignInUseCase(
              identityProviders,
              sealer,
              matcher,
              accounts,
              accounts,
              sessions,
              ids,
              clock,
              { callbackUrl },
            ),
            getMe: new GetMeUseCase(accounts),
            listIdentityProviders: new ListIdentityProvidersUseCase(identityProviders),
          },
          admin,
          validator,
          { secureCookies: config.publicOrigin.startsWith('https://') },
        ),
        new AdminController(
          {
            listCalendars: new ListCalendarsUseCase(calendars),
            createCalendar: this.createCalendar,
            getCalendarDetails: new GetCalendarDetailsUseCase(
              calendars,
              drafts,
              doors,
              members,
              openings,
              versions,
              subscriptions,
              draftPresenter,
            ),
            updateCalendar: new UpdateCalendarUseCase(calendars, calendars, validator),
            publishCalendar: this.publishCalendar,
            rotateCalendarKey: new RotateCalendarKeyUseCase(calendars, calendars, secrets),
            addDoor: this.addDoor,
            editDoor: new EditDoorUseCase(
              calendars,
              drafts,
              drafts,
              doors,
              openings,
              draftPresenter,
              validator,
            ),
            removeDoor: new RemoveDoorUseCase(drafts),
            sendTestNotification: new SendTestNotificationUseCase(
              calendars,
              subscriptions,
              subscriptions,
              push,
              messages,
            ),
          },
          admin,
          ownership,
          validator,
          dtos,
        ),
        new CommentsController(
          {
            addDoorComment: new AddDoorCommentUseCase(
              openedDoors,
              comments,
              commentNotifier,
              ids,
              clock,
              validator,
            ),
            addGiverDoorComment: new AddGiverDoorCommentUseCase(
              calendars,
              doors,
              comments,
              commentNotifier,
              ids,
              clock,
              validator,
            ),
            listDoorComments: new ListDoorCommentsUseCase(openedDoors, comments),
            listAdminDoorComments: new ListAdminDoorCommentsUseCase(comments),
            removeDoorComment: new RemoveDoorCommentUseCase(comments),
          },
          admin,
          ownership,
          validator,
          dtos,
        ),
        new MembersController(
          {
            addMember: this.addMember,
            renameMember: new RenameMemberUseCase(members, members, validator),
            rotateMemberKey: new RotateMemberKeyUseCase(members, members, secrets),
            removeMember: new RemoveMemberUseCase(members),
          },
          admin,
          ownership,
          validator,
          dtos,
        ),
        new MediaController(
          new UploadMediaUseCase(
            new DiskMediaStorage({ directory: config.mediaDir }),
            mediaFiles,
            mediaFiles,
            ids,
            clock,
            config.limits,
          ),
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
      sessionSecret: env.SESSION_SECRET,
      publicOrigin: env.PUBLIC_ORIGIN,
      google: CompositionRoot.oidcClient(env, 'GOOGLE'),
      microsoft: CompositionRoot.oidcClient(env, 'MICROSOFT'),
      limits: {
        calendars: env.LIMIT_CALENDARS,
        mediaBytes:
          env.LIMIT_MEDIA_MB === undefined || env.LIMIT_MEDIA_MB === ''
            ? undefined
            : String(Number(env.LIMIT_MEDIA_MB) * 1024 * 1024),
        membersPerCalendar: env.LIMIT_MEMBERS_PER_CALENDAR,
      },
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

  /** `<PREFIX>_CLIENT_ID` and `<PREFIX>_CLIENT_SECRET`, both or nothing. */
  private static oidcClient(env: NodeJS.ProcessEnv, prefix: string) {
    const clientId = env[`${prefix}_CLIENT_ID`];
    const clientSecret = env[`${prefix}_CLIENT_SECRET`];
    return clientId && clientSecret
      ? {
          clientId,
          clientSecret,
          ...(env[`${prefix}_DISCOVERY_URL`]
            ? { discoveryUrl: env[`${prefix}_DISCOVERY_URL`] }
            : {}),
        }
      : undefined;
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
    const doors = new InMemoryDoorRepository();
    return {
      calendars: new InMemoryCalendarRepository(),
      doors,
      drafts: new InMemoryDraftDoorRepository(),
      versions: new InMemoryCalendarVersionRepository(),
      comments: new InMemoryDoorCommentRepository(),
      subscriptions: new InMemorySubscriptionRepository(),
      members: new InMemoryMemberRepository(),
      openings: new InMemoryDoorOpeningRepository(doors),
      accounts: new InMemoryAccountRepository(),
      mediaFiles: new InMemoryMediaFileRepository(),
    };
  }

  private postgresStorage(db: Kysely<Database>): Storage {
    const errors = new PgDatabaseErrorTranslator();
    return {
      calendars: new PgCalendarRepository(db, errors),
      doors: new PgDoorRepository(db, errors),
      drafts: new PgDraftDoorRepository(db, errors),
      versions: new PgCalendarVersionRepository(db, errors),
      comments: new PgDoorCommentRepository(db, errors),
      subscriptions: new PgSubscriptionRepository(db),
      members: new PgMemberRepository(db, errors),
      openings: new PgDoorOpeningRepository(db, errors),
      accounts: new PgAccountRepository(db, errors),
      mediaFiles: new PgMediaFileRepository(db, errors),
    };
  }
}
