import type { ClassDeclaration, ClassExpression, Project, SourceFile } from 'ts-morph';
import type { RuleId, Violation } from './contract-check.model.js';

/** One architecture rule, checked one source file at a time. */
export interface Rule {
  readonly id: RuleId;
  check(sourceFile: SourceFile, paths: WorkspacePaths): readonly Violation[];
}

/** Presents violations to whoever ran the check. */
export interface ViolationReporter {
  report(violations: readonly Violation[]): void;
}

/** Creates a checker for a workspace root. Shared by the CLI and the tests. */
export interface ContractCheckerFactory {
  create(rootDir: string): ContractChecker;
}

/** Classifies files by where they sit in the monorepo. */
export interface WorkspacePaths {
  /** Path relative to the workspace root, always with forward slashes. */
  relative(filePath: string): string;
  /** True when the file sits inside `dir` (relative to the workspace root). */
  isWithin(filePath: string, dir: string): boolean;
  isTest(filePath: string): boolean;
  isCompositionRoot(filePath: string): boolean;
  isTestKit(filePath: string): boolean;
}

/** Runs every architecture rule over a workspace. */
export interface ContractChecker {
  check(): readonly Violation[];
}

/** Answers questions about a class's inheritance chain. */
export interface ClassHeritage {
  /** True when the class, or any base class in the project, has an `implements` clause. */
  implementsAnInterface(node: ClassDeclaration | ClassExpression): boolean;
  /** True when the class extends the built-in `Error`, directly or through base classes. */
  extendsError(node: ClassDeclaration | ClassExpression): boolean;
}

/** Builds a ts-morph project covering the source files the rules apply to. */
export interface ProjectLoader {
  load(rootDir: string): Project;
}
