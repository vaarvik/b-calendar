import path from 'node:path';
import { Node } from 'ts-morph';
import type { ClassDeclaration, SourceFile } from 'ts-morph';
import type { ClassHeritage, Rule, WorkspacePaths } from '../contract-check.ports.js';
import type { RuleId, Violation } from '../contract-check.model.js';

/**
 * Rule (f): outside contracts, a file holds at most one exported class (Error subclasses aside)
 * and is named after it: kebab-case, with a dot before the role, e.g. `CreatePlaceUseCase` in
 * `create-place.use-case.ts`, `PgUnitOfWork` in `pg.unit-of-work.ts`. A file without a class is
 * `<folder>.ports.ts` (interfaces) or `<folder>.model.ts` (data types and constants), named after
 * its folder; directly in `src/`, after the package folder (`contract-check.ports.ts`).
 */
export class ClassFileNamingRule implements Rule {
  public readonly id: RuleId = 'class-file-naming';

  public constructor(
    private readonly heritage: ClassHeritage,
    private readonly scopes: readonly RegExp[] = [
      /^packages\/(domain|application|in-memory)\/src\//,
      /^apps\/api\/src\//,
      /^tools\/[^/]+\/src\//,
      // Screens (app/) and components (ui/) are React function components: the UI exception.
      /^apps\/web\/src\/(?!app\/|ui\/)/,
    ],
    private readonly roles: readonly string[] = [
      'use-case',
      'unit-of-work',
      'repository',
      'controller',
      'migration',
      'provider',
      'calculator',
      'policy',
      'selector',
      'summarizer',
      'decider',
      'similarity',
      'validator',
      'refresher',
      'mapper',
      'authenticator',
      'server',
      'importer',
      'parser',
      'matcher',
      'resolver',
      'generator',
      'clock',
      'logger',
      'rate-limiter',
      'translator',
      'factory',
      'service',
      'rule',
      'checker',
      'loader',
      'reporter',
      'heritage',
      'paths',
      'reader',
      'writer',
      'client',
      'locator',
      'session',
      'cache',
      'storage',
      'transport',
      'presenter',
      'monitor',
      'notifier',
      'ranker',
      'cipher',
      'hasher',
      'scheduler',
      'sender',
      'classifier',
      'resizer',
      'subscriber',
    ],
    private readonly classlessKinds: readonly string[] = ['ports', 'model'],
    private readonly vagueMechanisms: readonly string[] = [
      'default',
      'basic',
      'simple',
      'generic',
      'standard',
      'impl',
    ],
    private readonly exemptFiles: ReadonlySet<string> = new Set([
      'index.ts',
      'cli.ts',
      'server.ts',
      'migrate.ts',
      'composition-root.ts',
    ]),
  ) {}

  public check(sourceFile: SourceFile, paths: WorkspacePaths): readonly Violation[] {
    const filePath = sourceFile.getFilePath();
    const relativePath = paths.relative(filePath);
    const fileName = path.basename(filePath);
    if (
      !this.scopes.some((scope) => scope.test(relativePath)) ||
      paths.isTest(filePath) ||
      paths.isTestKit(filePath) ||
      paths.isCompositionRoot(filePath) ||
      this.exemptFiles.has(fileName)
    ) {
      return [];
    }

    const classes = sourceFile
      .getClasses()
      .filter((node) => node.isExported())
      .filter((node) => !this.heritage.extendsError(node));
    const violation = (line: number, message: string): Violation => ({
      ruleId: this.id,
      file: relativePath,
      line,
      message,
    });

    const [only, second] = classes;
    if (only === undefined) {
      const prefix = this.folderPrefix(relativePath);
      const allowed = this.classlessKinds.map((kind) => `${prefix}.${kind}.ts`);
      return allowed.includes(fileName)
        ? []
        : [violation(1, `A file without a class must be named ${allowed.join(' or ')}.`)];
    }
    if (second !== undefined) {
      return [
        violation(
          second.getStartLineNumber(),
          `One exported class per file; move ${second.getName() ?? '<anonymous>'} to its own file.`,
        ),
      ];
    }

    const className = only.getName() ?? '';
    const problem = this.nameProblem(className, fileName);
    return [
      ...(problem === null ? [] : [violation(only.getStartLineNumber(), problem)]),
      ...this.otherExports(sourceFile, className, classes).map((node) =>
        violation(
          node.getStartLineNumber(),
          `A class file exports only ${className} and its ${className}Config; move ${this.exportName(node)} to a *.ports.ts or *.model.ts file.`,
        ),
      ),
    ];
  }

  /** Exports other than the class, its Error subclasses and its `<Class>Config` type. */
  private otherExports(
    sourceFile: SourceFile,
    className: string,
    classes: readonly ClassDeclaration[],
  ): Node[] {
    const allowed = new Set<Node>(classes);
    return [...sourceFile.getExportedDeclarations()].flatMap(([name, declarations]) =>
      declarations.filter(
        (node) =>
          node.getSourceFile() === sourceFile &&
          !allowed.has(node) &&
          !(Node.isClassDeclaration(node) && this.heritage.extendsError(node)) &&
          !(
            name === `${className}Config` &&
            (Node.isInterfaceDeclaration(node) || Node.isTypeAliasDeclaration(node))
          ),
      ),
    );
  }

  private exportName(node: Node): string {
    return Node.hasName(node) ? node.getName() : node.getKindName();
  }

  /** The folder name, or the package folder's name for a file directly in `src/`. */
  private folderPrefix(relativePath: string): string {
    const folders = relativePath.split('/').slice(0, -1);
    const parent = folders.at(-1) ?? '';
    return parent === 'src' ? (folders.at(-2) ?? parent) : parent;
  }

  private nameProblem(className: string, fileName: string): string | null {
    const kebab = className
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    const role = this.roles.find(
      (candidate) => kebab === candidate || kebab.endsWith(`-${candidate}`),
    );
    if (role === undefined) {
      return `Class ${className} must end in a known role (${this.roles.join(', ')}).`;
    }
    const prefix = kebab.slice(0, kebab.length - role.length - 1);
    const [leading] = prefix.split('-');
    if (leading !== undefined && this.vagueMechanisms.includes(leading)) {
      return `Class ${className} must name its mechanism; "${leading}" says nothing about how it works.`;
    }
    const expected = prefix.length === 0 ? `${role}.ts` : `${prefix}.${role}.ts`;
    return fileName === expected ? null : `Class ${className} must live in "${expected}".`;
  }
}
