import {
  AdminCredentialsSchema,
  AuthConfigResponseDtoSchema,
  DomainError,
  MeResponseDtoSchema,
  NotFoundError,
} from '@b-calendar/contracts';
import type { AccountSession, InputValidator } from '@b-calendar/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { AuthUseCases } from './accounts.model.js';
import { SESSION_COOKIE, SIGN_IN_COOKIE } from '../shared/shared.model.js';
import type { AdminRequestAuthenticator, HttpController } from '../shared/shared.ports.js';

export interface AuthControllerConfig {
  /** Cookies only over https when the site is served over https. */
  readonly secureCookies: boolean;
  /** Whether the old admin password still works. */
  readonly passwordEnabled: boolean;
}

const ProviderParamsSchema = z.object({ provider: z.string().max(40) });
const StartQuerySchema = z.object({ returnTo: z.string().max(500).default('/admin') });
const CallbackQuerySchema = z.object({
  code: z.string().max(4000).optional(),
  state: z.string().max(500).optional(),
  error: z.string().max(200).optional(),
});

/** Sign in with a provider (a round trip through it), with the old password, and sign out. */
export class AuthController implements HttpController {
  public constructor(
    private readonly useCases: AuthUseCases,
    private readonly admin: AdminRequestAuthenticator,
    private readonly validator: InputValidator,
    private readonly config: AuthControllerConfig,
  ) {}

  public register(app: FastifyInstance): void {
    const { startSignIn, completeSignIn, getMe, listIdentityProviders, logIn } = this.useCases;

    app.get('/v1/auth/config', () =>
      AuthConfigResponseDtoSchema.parse({
        providers: listIdentityProviders.execute(),
        password: this.config.passwordEnabled,
      }),
    );

    app.get('/v1/auth/:provider/start', async (request, reply) => {
      const { provider } = this.validator.validate(ProviderParamsSchema, request.params);
      const { returnTo } = this.validator.validate(StartQuerySchema, request.query);
      let started;
      try {
        started = await startSignIn.execute({ provider, returnTo });
      } catch (caught) {
        if (caught instanceof NotFoundError) {
          throw caught;
        }
        // The provider could not be reached (its discovery document): back to the sign-in page.
        request.log.error({ err: caught, provider }, 'Sign-in could not start');
        return reply.redirect('/admin?innlogging=feilet', 302);
      }
      return reply
        .setCookie(SIGN_IN_COOKIE, started.sealedChallenge, {
          ...this.cookie(),
          path: '/v1/auth',
          maxAge: 15 * 60,
        })
        .redirect(started.redirectUrl, 302);
    });

    app.get('/v1/auth/:provider/callback', async (request, reply) => {
      const { provider } = this.validator.validate(ProviderParamsSchema, request.params);
      const { code, state, error } = this.validator.validate(CallbackQuerySchema, request.query);
      reply.clearCookie(SIGN_IN_COOKIE, { ...this.cookie(), path: '/v1/auth' });
      const sealedChallenge = request.cookies[SIGN_IN_COOKIE];
      if (error !== undefined || code === undefined || state === undefined || !sealedChallenge) {
        return reply.redirect('/admin?innlogging=avbrutt', 302);
      }
      try {
        const done = await completeSignIn.execute({ provider, code, state, sealedChallenge });
        return await this.signedIn(reply, done.session).redirect(done.returnTo, 302);
      } catch (caught) {
        if (caught instanceof DomainError) {
          request.log.warn({ err: caught, provider }, 'Sign-in failed');
          return reply.redirect('/admin?innlogging=feilet', 302);
        }
        throw caught;
      }
    });

    app.post('/v1/admin/session', async (request, reply) => {
      const credentials = this.validator.validate(AdminCredentialsSchema, request.body);
      const session = await logIn.execute(credentials);
      return this.signedIn(reply, session).status(204).send();
    });

    app.post('/v1/auth/sign-out', (_request, reply) =>
      reply
        .clearCookie(SESSION_COOKIE, { ...this.cookie(), path: '/' })
        .status(204)
        .send(),
    );

    app.get('/v1/me', async (request, reply) => {
      const owner = this.admin.requireAdmin(request);
      const account = owner === null ? null : await getMe.execute({ accountId: owner });
      return reply.header('cache-control', 'no-store').send(
        MeResponseDtoSchema.parse({
          account: account === null ? null : { name: account.name, email: account.email },
        }),
      );
    });
  }

  private signedIn(reply: FastifyReply, session: AccountSession): FastifyReply {
    return reply.setCookie(SESSION_COOKIE, session.token, {
      ...this.cookie(),
      path: '/',
      expires: session.expiresAt,
    });
  }

  private cookie() {
    return { httpOnly: true, sameSite: 'lax', secure: this.config.secureCookies } as const;
  }
}
