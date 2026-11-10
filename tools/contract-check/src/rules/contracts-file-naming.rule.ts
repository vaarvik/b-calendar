import path from 'node:path';
import type { SourceFile } from 'ts-morph';
import type { Rule, WorkspacePaths } from '../contract-check.ports.js';
import type { RuleId, Violation } from '../contract-check.model.js';

/**
 * Rule (e): every feature folder in packages/contracts/src has the same shape. A file in
 * `<feature>/` is named `<feature>.<kind>.ts`, where kind is one of the allowed kinds.
 * Files directly in packages/contracts/src are limited to an allowlist.
 */
export class ContractsFileNamingRule implements Rule {
  public readonly id: RuleId = 'contracts-file-naming';

  public constructor(
    private readonly scope = 'packages/contracts/src',
    private readonly kinds: readonly string[] = ['model', 'ports', 'use-cases', 'dtos', 'errors'],
    private readonly rootFiles: ReadonlySet<string> = new Set(['index.ts', 'unit-of-work.ts']),
  ) {}

  public check(sourceFile: SourceFile, paths: WorkspacePaths): readonly Violation[] {
    const filePath = sourceFile.getFilePath();
    if (
      !paths.isWithin(filePath, this.scope) ||
      paths.isTestKit(filePath) ||
      paths.isTest(filePath)
    ) {
      return [];
    }

    const inScope = paths
      .relative(filePath)
      .slice(this.scope.length + 1)
      .split('/');
    const message = this.problem(inScope);
    return message === null
      ? []
      : [{ ruleId: this.id, file: paths.relative(filePath), line: 1, message }];
  }

  private problem(segments: readonly string[]): string | null {
    const [first, second, ...rest] = segments;
    if (first === undefined) {
      return null;
    }
    if (second === undefined) {
      return this.rootFiles.has(first)
        ? null
        : `Only ${[...this.rootFiles].join(', ')} may sit directly in ${this.scope}; put "${first}" in a feature folder.`;
    }
    if (rest.length > 0) {
      return `Feature folders are one level deep; "${segments.join('/')}" is nested.`;
    }
    const allowed = this.kinds.map((kind) => `${first}.${kind}.ts`);
    return allowed.includes(path.basename(second))
      ? null
      : `"${first}/${second}" must be one of: ${allowed.join(', ')}.`;
  }
}
