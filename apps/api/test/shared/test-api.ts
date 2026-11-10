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

  public async adminToken(): Promise<string> {
    const response = await this.app.inject({
      method: 'POST',
      url: '/v1/admin/session',
      payload: { password: ADMIN_PASSWORD },
    });
    return response.json<{ token: string }>().token;
  }

  public async close(): Promise<void> {
    await this.root.close();
    await rm(this.mediaDir, { recursive: true, force: true });
  }
}
