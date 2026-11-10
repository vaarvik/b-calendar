import type { SourceFile } from 'ts-morph';
import type { ClassHeritage, Rule, WorkspacePaths } from '../contract-check.ports.js';
import type { RuleId, Violation } from '../contract-check.model.js';

/**
 * Rule (a): every exported class in domain, application, in-memory and apps/api/src implements
 * at least one interface. The composition root, tests and Error subclasses are exempt.
 */
export class ClassImplementsInterfaceRule implements Rule {
  public readonly id: RuleId = 'class-implements-interface';

  public constructor(
    private readonly heritage: ClassHeritage,
    private readonly scopes: readonly string[] = [
      'packages/domain/src',
      'packages/application/src',
      'packages/in-memory/src',
      'apps/api/src',
      'apps/web/src',
    ],
  ) {}

  public check(sourceFile: SourceFile, paths: WorkspacePaths): readonly Violation[] {
    const filePath = sourceFile.getFilePath();
    if (
      !this.scopes.some((scope) => paths.isWithin(filePath, scope)) ||
      paths.isTest(filePath) ||
      paths.isCompositionRoot(filePath)
    ) {
      return [];
    }

    return sourceFile
      .getClasses()
      .filter((node) => node.isExported())
      .filter((node) => !this.heritage.extendsError(node))
      .filter((node) => !this.heritage.implementsAnInterface(node))
      .map((node) => ({
        ruleId: this.id,
        file: paths.relative(filePath),
        line: node.getStartLineNumber(),
        message: `Exported class ${node.getName() ?? '<anonymous>'} must implement at least one interface.`,
      }));
  }
}
