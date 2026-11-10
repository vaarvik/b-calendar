import { describe, expect, it, vi } from 'vitest';
import { IntervalJobScheduler } from '../../src/notifications/interval-job.scheduler.js';
import { PinoLogger } from '../../src/shared/pino.logger.js';
import { pino } from 'pino';

describe('IntervalJobScheduler', () => {
  const logger = new PinoLogger(pino({ level: 'silent' }));

  it('runs at once and then on every interval, and survives a failing run', async () => {
    vi.useFakeTimers();
    let runs = 0;
    const scheduler = new IntervalJobScheduler(
      () => {
        runs += 1;
        return runs === 2 ? Promise.reject(new Error('boom')) : Promise.resolve(runs);
      },
      logger,
      { name: 'test', intervalMs: 1000 },
    );

    scheduler.start();
    scheduler.start();
    await vi.advanceTimersByTimeAsync(2500);
    await scheduler.stop();
    await vi.advanceTimersByTimeAsync(5000);
    vi.useRealTimers();

    expect(runs).toBe(3);
  });
});
