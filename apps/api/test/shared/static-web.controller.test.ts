import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestApi } from './test-api.js';
import { TestApi as Api } from './test-api.js';

describe('StaticWebController', () => {
  let root: string;
  let api: TestApi;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'b-calendar-web-'));
    await mkdir(join(root, 'assets'));
    await writeFile(join(root, 'index.html'), '<html>app</html>');
    await writeFile(join(root, 'sw.js'), 'self');
    await writeFile(join(root, 'assets', 'app-123.js'), 'js');
    api = await Api.start({ webRoot: root });
  });

  afterAll(async () => {
    await api.close();
    await rm(root, { recursive: true, force: true });
  });

  it('serves files, hashed assets for a year, and the app for every page path', async () => {
    const sw = await api.app.inject({ url: '/sw.js' });
    const asset = await api.app.inject({ url: '/assets/app-123.js' });
    const page = await api.app.inject({ url: '/c/ida-30?k=abc' });
    const home = await api.app.inject({ url: '/' });
    const escape = await api.app.inject({ url: '/../package.json' });

    expect(sw.body).toBe('self');
    expect(sw.headers['cache-control']).toBe('no-cache');
    expect(asset.headers['cache-control']).toContain('immutable');
    expect(page.body).toBe('<html>app</html>');
    expect(home.body).toBe('<html>app</html>');
    expect(escape.body).toBe('<html>app</html>');
  });

  it('keeps JSON 404s for the API and media', async () => {
    const api404 = await api.app.inject({ url: '/v1/nope' });
    const media404 = await api.app.inject({ url: '/media/nope.png' });

    expect(api404.statusCode).toBe(404);
    expect(api404.json()).toMatchObject({ error: { code: 'not_found' } });
    expect(media404.statusCode).toBe(404);
  });
});
