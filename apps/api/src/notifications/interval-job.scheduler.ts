import type { Logger } from '@b-calendar/contracts';
import type { JobScheduler } from '../shared/shared.ports.js';

export interface IntervalJobSchedulerConfig {
  readonly name: string;
  readonly intervalMs: number;
}

/** Runs a job now and then every interval; never two runs at once; errors are logged. */
export class IntervalJobScheduler implements JobScheduler {
  private timer: NodeJS.Timeout | undefined;
  private running: Promise<void> = Promise.resolve();

  public constructor(
    private readonly job: () => Promise<unknown>,
    private readonly logger: Logger,
    private readonly config: IntervalJobSchedulerConfig,
  ) {}

  public start(): void {
    if (this.timer !== undefined) {
      return;
    }
    this.tick();
    this.timer = setInterval(() => {
      this.tick();
    }, this.config.intervalMs);
  }

  public async stop(): Promise<void> {
    clearInterval(this.timer);
    this.timer = undefined;
    await this.running;
  }

  private tick(): void {
    this.running = this.running.then(async () => {
      try {
        const result = await this.job();
        this.logger.debug(`${this.config.name} ran`, { result });
      } catch (error) {
        this.logger.error(`${this.config.name} failed`, { error: String(error) });
      }
    });
  }
}
