import path from 'node:path';
import type { WorkspacePaths } from './contract-check.ports.js';

export class RootRelativeWorkspacePaths implements WorkspacePaths {
  private static readonly testFilePattern = /\.(test|spec)\.tsx?$/;
  private static readonly testDirSegments: ReadonlySet<string> = new Set([
    'test',
    'tests',
    '__tests__',
  ]);

  public constructor(private readonly rootDir: string) {}

  public relative(filePath: string): string {
    return path.relative(this.rootDir, filePath).split(path.sep).join('/');
  }

  public isWithin(filePath: string, dir: string): boolean {
    const relativePath = this.relative(filePath);
    const prefix = dir.endsWith('/') ? dir : `${dir}/`;
    return relativePath.startsWith(prefix);
  }

  public isTest(filePath: string): boolean {
    const relativePath = this.relative(filePath);
    if (RootRelativeWorkspacePaths.testFilePattern.test(relativePath)) {
      return true;
    }
    return relativePath
      .split('/')
      .some((segment) => RootRelativeWorkspacePaths.testDirSegments.has(segment));
  }

  public isCompositionRoot(filePath: string): boolean {
    // The mobile composition root is split per platform: composition-root.platform(.web).ts.
    return /^composition-root(\.[a-z]+)*\.ts$/.test(path.basename(filePath));
  }

  public isTestKit(filePath: string): boolean {
    return this.relative(filePath).split('/').includes('test-kit');
  }
}
