import type { Project } from 'ts-morph';
import type { ContractChecker, Rule, WorkspacePaths } from './contract-check.ports.js';
import type { Violation } from './contract-check.model.js';

export class TsMorphContractChecker implements ContractChecker {
  public constructor(
    private readonly project: Project,
    private readonly paths: WorkspacePaths,
    private readonly rules: readonly Rule[],
  ) {}

  public check(): readonly Violation[] {
    return this.project
      .getSourceFiles()
      .filter((sourceFile) => !sourceFile.isDeclarationFile())
      .flatMap((sourceFile) => this.rules.flatMap((rule) => rule.check(sourceFile, this.paths)))
      .sort(
        (left, right) =>
          left.file.localeCompare(right.file) ||
          left.line - right.line ||
          left.ruleId.localeCompare(right.ruleId),
      );
  }
}
