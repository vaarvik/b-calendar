export interface Reporter {
  report(lines: readonly string[]): void;
}
