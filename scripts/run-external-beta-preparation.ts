import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

const steps = [
  ['lint', 'pnpm', ['lint']],
  ['unit-and-deterministic-tests', 'pnpm', ['test']],
  ['authoritative-simulation-audit', 'pnpm', ['simulation:audit']],
  ['production-build', 'pnpm', ['build']],
  ['consumer-build-audit', 'pnpm', ['consumer:audit']],
  ['offline-pwa-audit', 'pnpm', ['offline:verify']],
  ['consumer-browser-suite', 'pnpm', ['test:e2e:consumer']],
  ['desktop-source-check', 'pnpm', ['desktop:check']],
  ['dynamic-operations-certification', 'pnpm', ['operations:certify']],
  ['mission-authoring-certification', 'pnpm', ['authoring:certify']],
  ['balance-simulation', 'pnpm', ['balance:certify']],
  ['itch-relative-build', 'pnpm', ['itch:build']],
  ['itch-build-audit', 'pnpm', ['itch:audit']],
  ['itch-package', 'pnpm', ['itch:package']],
  ['itch-browser-suite-from-package', 'pnpm', ['itch:test:e2e']],
] as const;

const results: Array<{ name: string; status: 'PASS' | 'FAIL'; exitCode: number }> = [];
for (const [name, command, args] of steps) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true });
  const exitCode = result.status ?? 1;
  results.push({ name, status: exitCode === 0 ? 'PASS' : 'FAIL', exitCode });
  if (exitCode !== 0) break;
}

const passed = results.length === steps.length && results.every((result) => result.status === 'PASS');
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildId: RELEASE_INFO.buildId,
  releaseVersion: RELEASE_INFO.version,
  status: passed ? 'PREPARED' : 'FAILED',
  completedSteps: results.length,
  requiredSteps: steps.length,
  results,
};
const output = resolve('reports/external-beta/preparation.json');
mkdirSync(resolve('reports/external-beta'), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nExternal beta preparation: ${report.status} (${results.length}/${steps.length} checks)`);
if (!passed) process.exitCode = 1;
