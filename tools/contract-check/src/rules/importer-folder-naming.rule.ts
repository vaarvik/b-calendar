import path from 'node:path';
import { Node } from 'ts-morph';
import type { SourceFile } from 'ts-morph';
import type { Rule, WorkspacePaths } from '../contract-check.ports.js';
import type { RuleId, Violation } from '../contract-check.model.js';

/**
 * Rule (g): each folder in apps/api/src/imports/importers is named after the source it imports,
 * in kebab-case (`osm-overpass` for `osm_overpass`), and holds exactly one `*.importer.ts`
 * whose class declares that `source`. Importer folders are one level deep.
 */
export class ImporterFolderNamingRule implements Rule {
  public readonly id: RuleId = 'importer-folder-naming';

  public constructor(private readonly scope = 'apps/api/src/imports/importers') {}

  public check(sourceFile: SourceFile, paths: WorkspacePaths): readonly Violation[] {
    const filePath = sourceFile.getFilePath();
    if (!paths.isWithin(filePath, this.scope) || paths.isTest(filePath)) {
      return [];
    }
    const relativePath = paths.relative(filePath);
    const violation = (line: number, message: string): Violation[] => [
      { ruleId: this.id, file: relativePath, line, message },
    ];
    const segments = relativePath.slice(this.scope.length + 1).split('/');
    const [folder, fileName, ...nested] = segments;
    if (folder === undefined || fileName === undefined) {
      return violation(1, `Put "${segments.join('/')}" in a folder named after its source.`);
    }
    if (nested.length > 0) {
      return violation(
        1,
        `Importer folders are one level deep; "${segments.join('/')}" is nested.`,
      );
    }

    const importers = sourceFile
      .getDirectory()
      .getSourceFiles()
      .map((file) => file.getBaseName())
      .filter((name) => name.endsWith('.importer.ts'))
      .sort();
    if (importers.length === 0) {
      const [first] = sourceFile
        .getDirectory()
        .getSourceFiles()
        .map((file) => file.getBaseName())
        .sort();
      return first === fileName
        ? violation(1, `Importer folder "${folder}" has no *.importer.ts.`)
        : [];
    }
    if (!fileName.endsWith('.importer.ts')) {
      return [];
    }
    if (importers[0] !== fileName) {
      return violation(1, `One importer per folder; move ${fileName} to its source's folder.`);
    }
    return this.sourceProblem(sourceFile, folder, violation);
  }

  private sourceProblem(
    sourceFile: SourceFile,
    folder: string,
    violation: (line: number, message: string) => Violation[],
  ): readonly Violation[] {
    const expected = folder.replaceAll('-', '_');
    for (const node of sourceFile.getClasses()) {
      const initializer = node.getProperty('source')?.getInitializer();
      if (initializer === undefined) {
        continue;
      }
      const source = Node.isStringLiteral(initializer) ? initializer.getLiteralValue() : null;
      return source === expected
        ? []
        : violation(
            initializer.getStartLineNumber(),
            source === null
              ? `The importer's source must be a string literal ("${expected}").`
              : `Source "${source}" belongs in folder "${source.replaceAll('_', '-')}", not "${path.basename(folder)}".`,
          );
    }
    return violation(1, `The importer in "${folder}" must declare source = '${expected}'.`);
  }
}
