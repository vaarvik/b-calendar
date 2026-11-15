import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConstantTimeSecretMatcher } from '@b-calendar/domain';
import type { AccountId } from '@b-calendar/contracts';
import type { FastifyInstance } from 'fastify';
import { HmacAccountSessionService } from '../../src/accounts/hmac-account-session.service.js';
import { CompositionRoot } from '../../src/composition-root.js';
import type { ApiConfig } from '../../src/composition-root.js';
import { SystemClock } from '../../src/shared/system.clock.js';

/** The account the tests' calendars belong to. */
export const TEST_OWNER = '0e000000-0000-4000-8000-000000000001' as AccountId;
const SESSION_SECRET = 'x'.repeat(32);

/** The whole API in memory, with uploads in a temp directory. Close it after the test. */
export class TestApi {
  private constructor(
    public readonly root: CompositionRoot,
    public readonly app: FastifyInstance,
    private readonly mediaDir: string,
  ) {}

  public static async start(overrides: Partial<ApiConfig> = {}): Promise<TestApi> {
    const mediaDir = await mkdtemp(join(tmpdir(), 'b-calendar-media-'));
    const root = new CompositionRoot({
      storage: 'memory',
      sessionSecret: SESSION_SECRET,
      publicOrigin: 'http://localhost:3000',
      limits: { calendars: 5, mediaBytes: 50 * 1024 * 1024, membersPerCalendar: 30 },
      mediaDir,
      host: '127.0.0.1',
      port: 0,
      logLevel: 'silent',
      trustProxy: false,
      notifyIntervalSeconds: 30,
      notifyGraceMinutes: 180,
      ...overrides,
    });
    const app = root.httpServer.app();
    await app.ready();
    return new TestApi(root, app, mediaDir);
  }

  /** The headers of a browser signed in as this account, without the round trip through SSO. */
  public adminHeaders(owner: AccountId = TEST_OWNER): Record<string, string> {
    const sessions = new HmacAccountSessionService(
      { secret: SESSION_SECRET, ttlHours: 1 },
      new SystemClock(),
      new ConstantTimeSecretMatcher(),
    );
    return this.headersOf([{ name: 'bcal_session', value: sessions.issue(owner).token }]);
  }

  /** The headers a browser sends with the session cookie it was given. */
  public headersOf(cookies: readonly { name: string; value: string }[]): Record<string, string> {
    const session = cookies.find((cookie) => cookie.name === 'bcal_session');
    if (session === undefined) {
      throw new Error('No session cookie.');
    }
    return { cookie: `bcal_session=${session.value}`, 'x-requested-with': 'b-calendar' };
  }

  public async close(): Promise<void> {
    await this.root.close();
    await rm(this.mediaDir, { recursive: true, force: true });
  }
}
