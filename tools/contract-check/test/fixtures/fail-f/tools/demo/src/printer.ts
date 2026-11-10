export interface Reporter {
  report(): void;
}

export class PrinterReporter implements Reporter {
  public report(): void {}
}
