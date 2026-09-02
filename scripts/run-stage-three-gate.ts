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
  { name: 'balance-certification', ...tsx('scripts/run-balance-certification.ts') },
  { name: 'visual-manifest', ...tsx('scripts/audit-visual-manifest.ts') },
  { name: 'human-readability-evidence', ...tsx('scripts/verify-stage3-readability.ts') },
];
const results = checks.map((check) => {
  console.log(`\n=== Stage 3: ${check.name} ===`);
  const result = spawnSync(check.command, check.args, { cwd: process.cwd(), stdio: 'inherit', shell: false });
  return { name: check.name, passed: result.status === 0, exitCode: result.status ?? 1, error: result.error?.message ?? null };
});
const report = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, passed: results.every((result) => result.passed), results };
mkdirSync(join(process.cwd(), 'reports', 'stage-3'), { recursive: true });
writeFileSync(join(process.cwd(), 'reports', 'stage-3', 'stage-three-gate.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nStage 3 gate: ${report.passed ? 'PASS' : 'PENDING HUMAN READABILITY REVIEW'}`);
if (!report.passed) process.exitCode = 1;

