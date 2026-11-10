import { Node, SyntaxKind } from 'ts-morph';
import type { NewExpression, SourceFile } from 'ts-morph';
import type { ClassHeritage, Rule, WorkspacePaths } from '../contract-check.ports.js';
import type { RuleId, Violation } from '../contract-check.model.js';

/**
 * Rule (c): application, in-memory and api classes are only constructed with `new` in a
 * composition root or in tests. Migrations are exempt, because the migration provider builds
 * them. Classes declared in a composition root are exempt, so entry points can build the root.
 * Error subclasses are exempt: throwing an error is not wiring.
 */
export class ConstructionOutsideCompositionRootRule implements Rule {
  public readonly id: RuleId = 'construction-outside-composition-root';

  public constructor(
    private readonly heritage: ClassHeritage,
    private readonly protectedDirs: readonly string[] = [
      'packages/application',
      'packages/in-memory',
      'apps/api/src',
      'apps/web/src',
    ],
    private readonly exemptDirs: readonly string[] = ['apps/api/src/migrations'],
  ) {}

  public check(sourceFile: SourceFile, paths: WorkspacePaths): readonly Violation[] {
    const filePath = sourceFile.getFilePath();
    if (paths.isTest(filePath) || paths.isCompositionRoot(filePath)) {
      return [];
    }

    const violations: Violation[] = [];
    for (const expression of sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression)) {
      const declarationFile = this.declarationFileOf(expression);
      if (declarationFile === undefined) {
        continue;
      }
      const dir = this.protectedLocationOf(declarationFile, paths);
      if (dir !== undefined) {
        violations.push({
          ruleId: this.id,
          file: paths.relative(filePath),
          line: expression.getStartLineNumber(),
          message: `"new ${expression.getExpression().getText()}" constructs a class from ${dir}; only a composition root or a test may do that.`,
        });
      }
    }
    return violations;
  }

  private protectedLocationOf(filePath: string, paths: WorkspacePaths): string | undefined {
    if (
      paths.isCompositionRoot(filePath) ||
      this.exemptDirs.some((exemptDir) => paths.isWithin(filePath, exemptDir))
    ) {
      return undefined;
    }
    return this.protectedDirs.find((protectedDir) => paths.isWithin(filePath, protectedDir));
  }

  private declarationFileOf(expression: NewExpression): string | undefined {
    const symbol = expression.getExpression().getSymbol();
    if (symbol === undefined) {
      return undefined;
    }
    const target = symbol.isAlias() ? (symbol.getAliasedSymbol() ?? symbol) : symbol;
    const declaration = target
      .getDeclarations()
      .find((node) => Node.isClassDeclaration(node) || Node.isClassExpression(node));
    if (declaration === undefined || this.heritage.extendsError(declaration)) {
      return undefined;
    }
    return declaration.getSourceFile().getFilePath();
  }
}
