#!/usr/bin/env node
import path from 'node:path';
import { TsMorphContractCheckerFactory } from './ts-morph-contract-checker.factory.js';
import { ConsoleViolationReporter } from './console-violation.reporter.js';

const rootDir = path.resolve(process.argv[2] ?? '.');
const violations = new TsMorphContractCheckerFactory().create(rootDir).check();
new ConsoleViolationReporter().report(violations);
process.exitCode = violations.length > 0 ? 1 : 0;
