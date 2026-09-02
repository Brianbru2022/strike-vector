import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

const node = process.execPath;
const moduleEntry = (...parts: string[]) => join(process.cwd(), 'node_modules', ...parts);
const tsx = (script: string) => ({ command: node, args: [moduleEntry('tsx', 'dist', 'cli.mjs'), script] });
const checks: Array<{ name: string; command: string; args: string[] }> = [
  { name: 'type-check', command: node, args: [moduleEntry('typescript', 'bin', 'tsc'), '--noEmit'] },
  { name: 'deterministic-and-unit-tests', command: node, args: [moduleEntry('vitest', 'vitest.mjs'), 'run'] },
  { name: 'balance-certification', ...tsx('scripts/run-balance-certification.ts') },
  { name: 'balance-authority', ...tsx('scripts/audit-stage7-balance-authority.ts') },
  { name: 'balance-freeze', ...tsx('scripts/audit-stage7-balance-freeze.ts') },
  { name: 'campaign-validation-evidence', ...tsx('scripts/verify-campaign-validation.ts') },
];

const results = checks.map((check) => {
  console.log(`\n=== Stage 2: ${check.name} ===`);
  const result = spawnSync(check.command, check.args, { cwd: process.cwd(), stdio: 'inherit', shell: false });
  return { name: check.name, passed: result.status === 0, exitCode: result.status ?? 1, error: result.error?.message ?? null };
});
const report = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, passed: results.every((result) => result.passed), results };
const directory = join(process.cwd(), 'reports', 'stage-2');
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, 'stage-two-gate.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nStage 2 gate: ${report.passed ? 'PASS' : 'PENDING HUMAN CAMPAIGN RUNS'}`);
if (!report.passed) process.exitCode = 1;
