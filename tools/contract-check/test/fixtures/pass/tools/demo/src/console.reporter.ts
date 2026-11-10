import type { Reporter } from './demo.ports.js';

export class ConsoleReporter implements Reporter {
  public report(lines: readonly string[]): void {
    void lines;
  }
}
