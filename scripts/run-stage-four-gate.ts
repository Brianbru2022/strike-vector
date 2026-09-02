import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

const node = process.execPath;
const moduleEntry = (...parts: string[]) => join(process.cwd(), 'node_modules', ...parts);
const tsx = (script: string) => ({ command: node, args: [moduleEntry('tsx', 'dist', 'cli.mjs'), script] });
const checks = [
  { name: 'type-check', command: node, args: [moduleEntry('typescript', 'bin', 'tsc'), '--noEmit'] },
  { name: 'deterministic-and-unit-tests', command: node, args: [moduleEntry('vitest', 'vitest.mjs'), 'run'] },
  { name: 'control-browser-contract', command: node, args: [moduleEntry('@playwright', 'test', 'cli.js'), 'test', 'tests/e2e/campaign.spec.ts', '--grep', 'device-aware|simultaneous mobile touch|Xbox-compatible|first-frame controller'] },
  { name: 'hardware-control-evidence', ...tsx('scripts/verify-stage4-controls.ts') },
];
const results = checks.map((check) => {
  console.log(`\n=== Stage 4: ${check.name} ===`);
  const result = spawnSync(check.command, check.args, { cwd: process.cwd(), stdio: 'inherit', shell: false });
  return { name: check.name, passed: result.status === 0, exitCode: result.status ?? 1, error: result.error?.message ?? null };
});
const report = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, passed: results.every((result) => result.passed), results };
mkdirSync(join(process.cwd(), 'reports', 'stage-4'), { recursive: true });
writeFileSync(join(process.cwd(), 'reports', 'stage-4', 'stage-four-gate.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nStage 4 gate: ${report.passed ? 'PASS' : 'PENDING PHYSICAL HARDWARE RUNS'}`);
if (!report.passed) process.exitCode = 1;

