import { TypeCheckerClassHeritage } from './type-checker-class.heritage.js';
import { TsMorphContractChecker } from './ts-morph-contract.checker.js';
import { ClassFileNamingRule } from './rules/class-file-naming.rule.js';
import { ClassImplementsInterfaceRule } from './rules/class-implements-interface.rule.js';
import { ConstructionOutsideCompositionRootRule } from './rules/construction-outside-composition-root.rule.js';
import { ContractsClassRule } from './rules/contracts-class.rule.js';
import { ContractsFileNamingRule } from './rules/contracts-file-naming.rule.js';
import { ForbiddenImportRule } from './rules/forbidden-import.rule.js';
import { ImporterFolderNamingRule } from './rules/importer-folder-naming.rule.js';
import { PortMethodVerbRule } from './rules/port-method-verb.rule.js';
import { WorkspaceProjectLoader } from './workspace-project.loader.js';
import { RootRelativeWorkspacePaths } from './root-relative-workspace.paths.js';
import type { ContractChecker, ContractCheckerFactory } from './contract-check.ports.js';

export class TsMorphContractCheckerFactory implements ContractCheckerFactory {
  public create(rootDir: string): ContractChecker {
    const heritage = new TypeCheckerClassHeritage();
    return new TsMorphContractChecker(
      new WorkspaceProjectLoader().load(rootDir),
      new RootRelativeWorkspacePaths(rootDir),
      [
        new ClassImplementsInterfaceRule(heritage),
        new ForbiddenImportRule(),
        new ConstructionOutsideCompositionRootRule(heritage),
        new ContractsClassRule(heritage),
        new ContractsFileNamingRule(),
        new ClassFileNamingRule(heritage),
        new ImporterFolderNamingRule(),
        new PortMethodVerbRule(),
      ],
    );
  }
}
