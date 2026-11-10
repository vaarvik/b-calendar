import { defineConfig } from 'vitest/config';

const sourceCondition = '@b-calendar/source';
// TEST_SCOPE=unit (`pnpm test:unit`) skips the Docker-backed integration tests.
const unit = process.env.TEST_SCOPE === 'unit';

export default defineConfig({
  resolve: { conditions: [sourceCondition, 'module', 'node', 'development|production'] },
  ssr: { resolve: { conditions: [sourceCondition, 'node', 'development|production'] } },
  test: {
    passWithNoTests: true,
    env: {
      // Testcontainers mounts the Docker socket into its cleanup container; this is the path
      // inside the Docker VM (Colima, Docker Desktop) or host (Linux).
      TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE:
        process.env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE ?? '/var/run/docker.sock',
    },
    coverage: {
      provider: 'v8',
      include: [
        'packages/domain/src/**',
        'packages/application/src/**',
        'packages/in-memory/src/**',
        'apps/api/src/**',
      ],
      // Wiring and entry points: exercised by the API tests, not worth a floor of their own.
      exclude: [
        '**/index.ts',
        '**/composition-root.ts',
        '**/server.ts',
        '**/migrate.ts',
        '**/cli.ts',
      ],
      thresholds: {
        'packages/domain/src/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'packages/application/src/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'packages/in-memory/src/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        'apps/api/src/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
      },
    },
    projects: [
      'packages/contracts',
      'packages/domain',
      'packages/in-memory',
      'packages/application',
      'apps/api',
      'tools/contract-check',
    ].map((root) => ({
      extends: true,
      test: {
        name: root.split('/').at(-1) ?? root,
        root,
        // ts-morph loads whole fixture workspaces; slow under coverage.
        testTimeout: root.startsWith('tools/') ? 30_000 : 5_000,
        include: ['{src,test,test-kit}/**/*.test.ts'],
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          'test/fixtures/**',
          ...(unit ? ['**/*.integration.test.ts'] : []),
        ],
      },
    })),
  },
});
