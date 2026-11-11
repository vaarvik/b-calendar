import { isAbsolute } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApiConfigSchema, CompositionRoot } from '../../src/composition-root.js';

const BASE = {
  storage: 'memory',
  adminPassword: 'correct horse battery',
  sessionSecret: 'x'.repeat(32),
};

describe('ApiConfigSchema', () => {
  it('makes the media and web directories absolute', () => {
    const config = ApiConfigSchema.parse({
      ...BASE,
      mediaDir: 'data/media',
      webRoot: 'apps/web/dist',
    });

    expect(isAbsolute(config.mediaDir)).toBe(true);
    expect(config.webRoot !== undefined && isAbsolute(config.webRoot)).toBe(true);
  });

  it('reads sslmode in a database URL as libpq does: require encrypts without checking the certificate', () => {
    const parse = (databaseUrl: string) =>
      ApiConfigSchema.parse({ ...BASE, storage: 'postgres', databaseUrl }).databaseUrl;

    expect(parse('postgresql://u:p@db:5432/app?sslmode=require')).toBe(
      'postgresql://u:p@db:5432/app?sslmode=require&uselibpqcompat=true',
    );
    expect(parse('postgresql://u:p@db:5432/app?sslmode=require&uselibpqcompat=false')).toBe(
      'postgresql://u:p@db:5432/app?sslmode=require&uselibpqcompat=false',
    );
    expect(parse('postgres://u:p@localhost:5433/app')).toBe('postgres://u:p@localhost:5433/app');
  });

  it('requires a database URL for Postgres and a long enough password', () => {
    expect(ApiConfigSchema.safeParse({ ...BASE, storage: 'postgres' }).success).toBe(false);
    expect(ApiConfigSchema.safeParse({ ...BASE, adminPassword: 'short' }).success).toBe(false);
  });
});

describe('CompositionRoot.configFromEnv', () => {
  const env = {
    STORAGE: 'memory',
    ADMIN_PASSWORD: 'correct horse battery',
    SESSION_SECRET: 'x'.repeat(32),
  };

  it('uses defaults for unset and empty variables, and leaves push off without keys', () => {
    const config = CompositionRoot.configFromEnv({ ...env, WEB_ROOT: '', VAPID_PUBLIC_KEY: '' });

    expect(config).toMatchObject({ storage: 'memory', port: 3000, notifyIntervalSeconds: 30 });
    expect(config.webRoot).toBeUndefined();
    expect(config.push).toBeUndefined();
  });

  it('turns push on with both VAPID keys', () => {
    const config = CompositionRoot.configFromEnv({
      ...env,
      VAPID_PUBLIC_KEY: 'pub',
      VAPID_PRIVATE_KEY: 'priv',
      VAPID_SUBJECT: 'https://b.example',
    });

    expect(config.push).toEqual({
      publicKey: 'pub',
      privateKey: 'priv',
      subject: 'https://b.example',
    });
  });
});
