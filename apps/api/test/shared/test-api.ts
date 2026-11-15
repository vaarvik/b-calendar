import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { CompositionRoot } from '../../src/composition-root.js';
import type { ApiConfig } from '../../src/composition-root.js';

export const ADMIN_PASSWORD = 'correct horse battery';

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
      adminPassword: ADMIN_PASSWORD,
      sessionSecret: 'x'.repeat(32),
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

  /** Signs in with the old admin password: headers for the unowned calendars. */
  public async adminHeaders(): Promise<Record<string, string>> {
    const response = await this.app.inject({
      method: 'POST',
      url: '/v1/admin/session',
      payload: { password: ADMIN_PASSWORD },
    });
    return this.headersOf(response.cookies);
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
