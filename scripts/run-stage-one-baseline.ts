import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

const node = process.execPath;
const moduleEntry = (...parts: string[]) => join(process.cwd(), 'node_modules', ...parts);
const tsx = (script: string) => ({ command: node, args: [moduleEntry('tsx', 'dist', 'cli.mjs'), script] });
const checks: Array<{ script: string; command: string; args: string[] }> = [
  { script: 'lint', command: node, args: [moduleEntry('typescript', 'bin', 'tsc'), '--noEmit'] },
  { script: 'test', command: node, args: [moduleEntry('vitest', 'vitest.mjs'), 'run'] },
  { script: 'simulation:audit', ...tsx('scripts/audit-authoritative-simulation.ts') },
  { script: 'branding:audit', ...tsx('scripts/audit-consumer-branding.ts') },
  { script: 'balance:certify', ...tsx('scripts/run-balance-certification.ts') },
  { script: 'build:web', command: node, args: [moduleEntry('vite', 'bin', 'vite.js'), 'build'] },
  { script: 'build:server', command: node, args: [moduleEntry('esbuild', 'bin', 'esbuild'), 'server.ts', '--bundle', '--platform=node', '--format=cjs', '--packages=external', '--sourcemap', '--outfile=dist/server.cjs'] },
  { script: 'consumer:audit', ...tsx('scripts/audit-consumer-build.ts') },
  { script: 'offline:verify', ...tsx('scripts/verify-offline-build.ts') },
  { script: 'visual:manifest:audit', ...tsx('scripts/audit-visual-manifest.ts') },
  { script: 'validation:evidence', ...tsx('scripts/verify-playtest-evidence.ts') },
  { script: 'defects:audit', ...tsx('scripts/audit-stage-one-defects.ts') },
];
const results = checks.map((check) => {
  console.log(`\n=== Stage 1: ${check.script} ===`);
  const result = spawnSync(check.command, check.args, { cwd: process.cwd(), stdio: 'inherit', shell: false });
  return { script: check.script, passed: result.status === 0, exitCode: result.status ?? 1, error: result.error?.message ?? null };
});
const report = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, passed: results.every((result) => result.passed), results };
const directory = join(process.cwd(), 'reports', 'stage-1');
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, 'baseline-gate.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nStage 1 baseline: ${report.passed ? 'PASS' : 'PENDING'}`);
if (!report.passed) process.exitCode = 1;
