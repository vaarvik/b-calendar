import path from 'node:path';
import { Node, SyntaxKind } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import type { Rule, WorkspacePaths } from '../contract-check.ports.js';
import type { RuleId, Violation } from '../contract-check.model.js';

/**
 * Rule (b): packages/domain and packages/application never import from apps/*,
 * Fastify, Kysely, pg, Expo or React Native. Type-only and dynamic imports count too.
 */
export class ForbiddenImportRule implements Rule {
  public readonly id: RuleId = 'forbidden-import';

  public constructor(
    private readonly scopes: readonly string[] = ['packages/domain', 'packages/application'],
    private readonly forbiddenPackages: readonly RegExp[] = [
      /^fastify(\/|$)/,
      /^@fastify\//,
      /^kysely(\/|$)/,
      /^pg(\/|$)/,
      /^expo(-[^/]+)?(\/|$)/,
      /^@expo\//,
      /^react-native(-[^/]+)?(\/|$)/,
      /^@react-native(-community)?\//,
      /^web-push(\/|$)/,
      /^react(-dom)?(\/|$)/,
      /^@b-calendar\/(api|web)(\/|$)/,
    ],
    private readonly forbiddenDirs: readonly string[] = ['apps'],
  ) {}

  public check(sourceFile: SourceFile, paths: WorkspacePaths): readonly Violation[] {
    const filePath = sourceFile.getFilePath();
    if (!this.scopes.some((scope) => paths.isWithin(filePath, scope))) {
      return [];
    }

    return this.moduleSpecifiers(sourceFile)
      .filter(({ specifier }) => this.isForbidden(specifier, filePath, paths))
      .map(({ specifier, line }) => ({
        ruleId: this.id,
        file: paths.relative(filePath),
        line,
        message: `Import of "${specifier}" is not allowed from ${this.scopeOf(filePath, paths)}.`,
      }));
  }

  private moduleSpecifiers(
    sourceFile: SourceFile,
  ): readonly { readonly specifier: string; readonly line: number }[] {
    const found: { specifier: string; line: number }[] = [];

    for (const declaration of sourceFile.getImportDeclarations()) {
      found.push({
        specifier: declaration.getModuleSpecifierValue(),
        line: declaration.getStartLineNumber(),
      });
    }
    for (const declaration of sourceFile.getExportDeclarations()) {
      const specifier = declaration.getModuleSpecifierValue();
      if (specifier !== undefined) {
        found.push({ specifier, line: declaration.getStartLineNumber() });
      }
    }
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const callee = call.getExpression();
      const isDynamicImport = callee.getKind() === SyntaxKind.ImportKeyword;
      const isRequire = Node.isIdentifier(callee) && callee.getText() === 'require';
      const [argument] = call.getArguments();
      if ((isDynamicImport || isRequire) && Node.isStringLiteral(argument)) {
        found.push({ specifier: argument.getLiteralValue(), line: call.getStartLineNumber() });
      }
    }
    for (const importType of sourceFile.getDescendantsOfKind(SyntaxKind.ImportType)) {
      const argument = importType.getArgument();
      if (Node.isLiteralTypeNode(argument)) {
        const literal = argument.getLiteral();
        if (Node.isStringLiteral(literal)) {
          found.push({
            specifier: literal.getLiteralValue(),
            line: importType.getStartLineNumber(),
          });
        }
      }
    }

    return found;
  }

  private isForbidden(specifier: string, filePath: string, paths: WorkspacePaths): boolean {
    if (specifier.startsWith('.')) {
      const target = path.resolve(path.dirname(filePath), specifier);
      return this.forbiddenDirs.some((dir) => paths.isWithin(target, dir));
    }
    return this.forbiddenPackages.some((pattern) => pattern.test(specifier));
  }

  private scopeOf(filePath: string, paths: WorkspacePaths): string {
    return this.scopes.find((scope) => paths.isWithin(filePath, scope)) ?? 'this package';
  }
}
