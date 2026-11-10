import { createECDH, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import type { Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import type { PushEndpoint, PushMessage } from '@b-calendar/contracts';
import { pino } from 'pino';
import webPush from 'web-push';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NullPushSender } from '../../src/notifications/null-push.sender.js';
import { WebPushSender } from '../../src/notifications/web-push.sender.js';
import { PinoLogger } from '../../src/shared/pino.logger.js';

const fixtures = join(import.meta.dirname, '..', 'fixtures');
const MESSAGE: PushMessage = {
  title: 'Luke 1',
  body: 'Åpen',
  url: '/c/x?k=y&door=1',
  tag: 'door-1',
};
const logger = new PinoLogger(pino({ level: 'silent' }));

/** A stand-in push service: the path's last part is the status code it answers with. */
describe('WebPushSender', () => {
  let server: Server;
  let base: string;
  const received: { path: string; authorization: string | undefined; ttl: string | undefined }[] =
    [];

  beforeAll(async () => {
    // The stand-in uses a self-signed certificate.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    server = createServer(
      {
        key: readFileSync(join(fixtures, 'localhost.key')),
        cert: readFileSync(join(fixtures, 'localhost.crt')),
      },
      (request, response) => {
        received.push({
          path: request.url ?? '',
          authorization: request.headers.authorization,
          ttl: request.headers.ttl as string | undefined,
        });
        request.resume();
        response.statusCode = Number(request.url?.split('/').at(-1));
        response.end();
      },
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `https://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  });

  function endpoint(status: number): PushEndpoint {
    const ecdh = createECDH('prime256v1');
    ecdh.generateKeys();
    return {
      endpoint: `${base}/push/${String(status)}`,
      keys: {
        p256dh: ecdh.getPublicKey().toString('base64url'),
        auth: randomBytes(16).toString('base64url'),
      },
    };
  }

  const keys = webPush.generateVAPIDKeys();
  const sender = new WebPushSender(
    {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      subject: 'https://b.example',
      ttlSeconds: 600,
    },
    logger,
  );

  it('sends an encrypted, VAPID-signed push', async () => {
    await expect(sender.send(endpoint(201), MESSAGE)).resolves.toBe('sent');

    expect(received.at(-1)).toMatchObject({ path: '/push/201', ttl: '600' });
    expect(received.at(-1)?.authorization).toMatch(/^vapid t=.+, k=.+$/);
  });

  it.each([
    [404, 'gone'],
    [410, 'gone'],
    [500, 'failed'],
  ])('reports a %i as %s', async (status, outcome) => {
    await expect(sender.send(endpoint(status), MESSAGE)).resolves.toBe(outcome);
  });

  it('reports an unreachable push service as failed', async () => {
    const unreachable = { ...endpoint(201), endpoint: 'https://127.0.0.1:1/push' };

    await expect(sender.send(unreachable, MESSAGE)).resolves.toBe('failed');
  });
});

describe('NullPushSender', () => {
  it('sends nothing', async () => {
    await expect(new NullPushSender(logger).send()).resolves.toBe('failed');
  });
});
