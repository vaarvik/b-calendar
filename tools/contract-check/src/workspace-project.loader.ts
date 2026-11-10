import path from 'node:path';
import { ModuleKind, ModuleResolutionKind, Project, ScriptTarget } from 'ts-morph';
import type { ProjectLoader } from './contract-check.ports.js';

export class WorkspaceProjectLoader implements ProjectLoader {
  public constructor(
    private readonly globs: readonly string[] = [
      'packages/*/src/**/*.{ts,tsx}',
      'packages/*/test-kit/**/*.{ts,tsx}',
      'packages/*/test/**/*.{ts,tsx}',
      'apps/api/src/**/*.{ts,tsx}',
      'apps/api/test/**/*.{ts,tsx}',
      'apps/web/src/**/*.{ts,tsx}',
      'tools/*/src/**/*.{ts,tsx}',
    ],
  ) {}

  public load(rootDir: string): Project {
    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        target: ScriptTarget.ES2023,
        module: ModuleKind.NodeNext,
        moduleResolution: ModuleResolutionKind.NodeNext,
        customConditions: ['@b-calendar/source'],
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
    });
    project.addSourceFilesAtPaths([
      ...this.globs.map((glob) => path.join(rootDir, glob)),
      `!${path.join(rootDir, '**/node_modules/**')}`,
      `!${path.join(rootDir, '**/dist/**')}`,
    ]);
    return project;
  }
}
