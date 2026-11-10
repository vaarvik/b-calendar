import type { Violation } from './contract-check.model.js';
import type { ViolationReporter } from './contract-check.ports.js';

export class ConsoleViolationReporter implements ViolationReporter {
  public report(violations: readonly Violation[]): void {
    if (violations.length === 0) {
      console.log('contract-check: no violations.');
      return;
    }
    for (const violation of violations) {
      console.error(
        `${violation.file}:${String(violation.line)}  ${violation.ruleId}  ${violation.message}`,
      );
    }
    console.error(`\ncontract-check: ${String(violations.length)} violation(s).`);
  }
}
