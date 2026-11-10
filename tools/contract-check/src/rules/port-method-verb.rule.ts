import type { SourceFile } from 'ts-morph';
import type { Rule, WorkspacePaths } from '../contract-check.ports.js';
import type { RuleId, Violation } from '../contract-check.model.js';

/**
 * Rule (h): methods of `*Reader` and `*Writer` ports in `*.ports.ts` files start with an
 * allowed verb, so the name says what a call returns or changes: readers get, find, list or
 * search; writers create, save, append, upsert or remove.
 */
export class PortMethodVerbRule implements Rule {
  public readonly id: RuleId = 'port-method-verb';

  public constructor(
    private readonly verbs: Readonly<Record<string, readonly string[]>> = {
      Reader: ['get', 'find', 'list', 'search'],
      Writer: ['create', 'save', 'append', 'upsert', 'remove'],
    },
  ) {}

  public check(sourceFile: SourceFile, paths: WorkspacePaths): readonly Violation[] {
    const filePath = sourceFile.getFilePath();
    if (!filePath.endsWith('.ports.ts') || paths.isTest(filePath) || paths.isTestKit(filePath)) {
      return [];
    }
    return sourceFile.getInterfaces().flatMap((port) => {
      const name = port.getName();
      const kind = Object.keys(this.verbs).find((suffix) => name.endsWith(suffix));
      const verbs = kind === undefined ? undefined : this.verbs[kind];
      if (verbs === undefined) {
        return [];
      }
      return port
        .getMethods()
        .filter(
          (method) => !verbs.some((verb) => new RegExp(`^${verb}([A-Z]|$)`).test(method.getName())),
        )
        .map((method) => ({
          ruleId: this.id,
          file: paths.relative(filePath),
          line: method.getStartLineNumber(),
          message: `${name}.${method.getName()} must start with ${verbs.join(', ')}.`,
        }));
    });
  }
}
