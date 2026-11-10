import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TsMorphContractCheckerFactory } from '../src/ts-morph-contract-checker.factory.js';
import type { RuleId, Violation } from '../src/contract-check.model.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

/** Violations in a fixture, limited to one rule when `only` is given. */
function checkFixture(
  name: string,
  only?: RuleId,
): readonly Pick<Violation, 'ruleId' | 'file' | 'line'>[] {
  return new TsMorphContractCheckerFactory()
    .create(path.join(fixturesDir, name))
    .check()
    .filter(({ ruleId }) => only === undefined || ruleId === only)
    .map(({ ruleId, file, line }) => ({ ruleId, file, line }));
}

describe('contract-check', () => {
  it('passes a workspace that follows every rule', () => {
    expect(checkFixture('pass')).toEqual([]);
  });

  it('(a) flags exported classes in application and api/src that implement no interface', () => {
    expect(checkFixture('fail-a', 'class-implements-interface')).toEqual([
      {
        ruleId: 'class-implements-interface',
        file: 'apps/api/src/http/places-controller.ts',
        line: 9,
      },
      {
        ruleId: 'class-implements-interface',
        file: 'packages/application/src/submit-report-use-case.ts',
        line: 1,
      },
    ]);
  });

  it('(b) flags framework, driver, SDK and apps/* imports from domain and application', () => {
    const domain = 'packages/domain/src/calculator.ts';
    const application = 'packages/application/src/locate.ts';
    expect(checkFixture('fail-b', 'forbidden-import')).toEqual([
      { ruleId: 'forbidden-import', file: application, line: 1 },
      { ruleId: 'forbidden-import', file: application, line: 2 },
      { ruleId: 'forbidden-import', file: application, line: 3 },
      { ruleId: 'forbidden-import', file: application, line: 4 },
      { ruleId: 'forbidden-import', file: application, line: 7 },
      { ruleId: 'forbidden-import', file: domain, line: 2 },
      { ruleId: 'forbidden-import', file: domain, line: 3 },
      { ruleId: 'forbidden-import', file: domain, line: 4 },
      { ruleId: 'forbidden-import', file: domain, line: 9 },
    ]);
  });

  it('(c) flags `new` on application, in-memory and api classes outside the composition root', () => {
    const rule = 'construction-outside-composition-root';
    const places = 'apps/api/src/places/places.controller.ts';
    const reports = 'apps/api/src/reports/reports.controller.ts';
    expect(checkFixture('fail-c', rule)).toEqual([
      { ruleId: rule, file: places, line: 11 },
      { ruleId: rule, file: places, line: 12 },
      { ruleId: rule, file: places, line: 13 },
      { ruleId: rule, file: reports, line: 11 },
      { ruleId: rule, file: reports, line: 12 },
      { ruleId: rule, file: 'packages/application/src/create-place-use-case.ts', line: 5 },
    ]);
  });

  it('(d) flags classes in contracts/src other than Error subclasses, outside the test kit', () => {
    expect(checkFixture('fail-d', 'contracts-class')).toEqual([
      { ruleId: 'contracts-class', file: 'packages/contracts/src/places/places.model.ts', line: 5 },
      { ruleId: 'contracts-class', file: 'packages/contracts/src/places/places.model.ts', line: 9 },
    ]);
  });

  it('(e) flags contracts files that break the feature-folder naming standard', () => {
    expect(checkFixture('fail-e', 'contracts-file-naming')).toEqual([
      {
        ruleId: 'contracts-file-naming',
        file: 'packages/contracts/src/devices/device-ports.ts',
        line: 1,
      },
      { ruleId: 'contracts-file-naming', file: 'packages/contracts/src/ids.ts', line: 1 },
      {
        ruleId: 'contracts-file-naming',
        file: 'packages/contracts/src/places/nested/places.model.ts',
        line: 1,
      },
      {
        ruleId: 'contracts-file-naming',
        file: 'packages/contracts/src/places/queries.ts',
        line: 1,
      },
    ]);
  });

  it('(f) flags class files not named after their class and role, ports/model files not named after their folder, extra exports and vague mechanisms', () => {
    const rule = 'class-file-naming';
    expect(checkFixture('fail-f', rule)).toEqual([
      { ruleId: rule, file: 'apps/api/src/places/helpers.ts', line: 1 },
      { ruleId: rule, file: 'apps/api/src/places/pg-place.repository.ts', line: 1 },
      { ruleId: rule, file: 'apps/api/src/places/place-row.model.ts', line: 1 },
      { ruleId: rule, file: 'apps/api/src/places/places.widget.ts', line: 1 },
      { ruleId: rule, file: 'apps/api/src/places/places.widget.ts', line: 5 },
      { ruleId: rule, file: 'apps/web/src/devices/token-thing.ts', line: 1 },
      { ruleId: rule, file: 'packages/application/src/places.use-case.ts', line: 11 },
      { ruleId: rule, file: 'packages/domain/src/calculator.ts', line: 1 },
      { ruleId: rule, file: 'packages/domain/src/calculator.ts', line: 5 },
      { ruleId: rule, file: 'packages/domain/src/default-weight.policy.ts', line: 1 },
      { ruleId: rule, file: 'packages/domain/src/default-weight.policy.ts', line: 5 },
      { ruleId: rule, file: 'tools/demo/src/printer.ts', line: 1 },
      { ruleId: rule, file: 'tools/demo/src/printer.ts', line: 5 },
      { ruleId: rule, file: 'tools/demo/src/size.model.ts', line: 1 },
    ]);
  });

  it('(g) flags importer folders not named after their source', () => {
    const rule = 'importer-folder-naming';
    const dir = 'apps/api/src/imports/importers';
    expect(checkFixture('fail-g', rule)).toEqual([
      { ruleId: rule, file: `${dir}/brreg-underenheter/b-brreg.importer.ts`, line: 1 },
      { ruleId: rule, file: `${dir}/empty/empty.model.ts`, line: 1 },
      { ruleId: rule, file: `${dir}/loose.model.ts`, line: 1 },
      { ruleId: rule, file: `${dir}/osm/overpass-osm.importer.ts`, line: 2 },
      { ruleId: rule, file: `${dir}/statement/parsers/csv-statement.parser.ts`, line: 1 },
      { ruleId: rule, file: `${dir}/statement/statement.importer.ts`, line: 4 },
    ]);
  });

  it('(h) flags Reader and Writer port methods that do not start with an allowed verb', () => {
    const rule = 'port-method-verb';
    const places = 'packages/contracts/src/places/places.ports.ts';
    expect(checkFixture('fail-h', rule)).toEqual([
      { ruleId: rule, file: 'apps/api/src/feeds/feeds.ports.ts', line: 2 },
      { ruleId: rule, file: places, line: 3 },
      { ruleId: rule, file: places, line: 4 },
      { ruleId: rule, file: places, line: 9 },
    ]);
  });
});
