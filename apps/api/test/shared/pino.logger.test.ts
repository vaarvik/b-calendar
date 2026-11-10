import { Writable } from 'node:stream';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { PinoLogger } from '../../src/shared/pino.logger.js';

describe('PinoLogger', () => {
  it('writes every level with its fields', () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, done) {
        lines.push(chunk.toString());
        done();
      },
    });
    const logger = new PinoLogger(pino({ level: 'debug' }, stream));

    logger.debug('d', { a: 1 });
    logger.info('i');
    logger.warn('w');
    logger.error('e', { b: 2 });

    expect(lines.map((line) => (JSON.parse(line) as { msg: string }).msg)).toEqual([
      'd',
      'i',
      'w',
      'e',
    ]);
    expect(lines[0]).toContain('"a":1');
  });
});
