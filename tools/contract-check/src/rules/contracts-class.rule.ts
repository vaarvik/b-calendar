import { SyntaxKind } from 'ts-morph';
import type { ClassDeclaration, ClassExpression, SourceFile } from 'ts-morph';
import type { ClassHeritage, Rule, WorkspacePaths } from '../contract-check.ports.js';
import type { RuleId, Violation } from '../contract-check.model.js';

/**
 * Rule (d): packages/contracts/src holds interfaces only. The one kind of class allowed there
 * is an Error subclass. The test kit is exempt.
 */
export class ContractsClassRule implements Rule {
  public readonly id: RuleId = 'contracts-class';

  public constructor(
    private readonly heritage: ClassHeritage,
    private readonly scope = 'packages/contracts/src',
  ) {}

  public check(sourceFile: SourceFile, paths: WorkspacePaths): readonly Violation[] {
    const filePath = sourceFile.getFilePath();
    if (!paths.isWithin(filePath, this.scope) || paths.isTestKit(filePath)) {
      return [];
    }

    const classes: (ClassDeclaration | ClassExpression)[] = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ClassExpression),
    ];
    return classes
      .filter((node) => !this.heritage.extendsError(node))
      .map((node) => ({
        ruleId: this.id,
        file: paths.relative(filePath),
        line: node.getStartLineNumber(),
        message: `Class ${node.getName() ?? '<anonymous>'} is not allowed in ${this.scope}: contracts hold interfaces, types, schemas and Error subclasses only.`,
      }));
  }
}
