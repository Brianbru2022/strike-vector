import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

const spec = readFileSync(resolve('tests/e2e/campaign.spec.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { scripts?: Record<string, string> };
const checks: Array<{ name: string; passed: boolean }> = [];
const check = (name: string, passed: boolean) => checks.push({ name, passed });

const directTests = [...spec.matchAll(/^test\('/gm)].length;
const actThreeBlock = spec.match(/const actThreeMissions = \[([\s\S]*?)\n\];/)?.[1] ?? '';
const parameterisedTests = [...actThreeBlock.matchAll(/^\s*\{ button:/gm)].length;
const declaredTests = directTests + parameterisedTests;
const skipCalls = [...spec.matchAll(/test\.skip\(([^\n]+)\);/g)].map((match) => match[1]);

check('No focused test is committed', !spec.includes('test.only(') && !spec.includes('test.describe.only('));
check('No unresolved fixme test is committed', !spec.includes('test.fixme('));
check('Campaign browser inventory contains 34 scenarios', declaredTests === 34);
check('Exactly five project-inapplicable duplicates are skipped', skipCalls.length === 5);
check('Every project skip explains why it is inapplicable', skipCalls.every((call) => /,\s*['"][^'"]{12,}['"]$/.test(call)));
check('HMS Invincible integrity uses the current HUD contract', spec.includes("page.getByText(/HMS INVINCIBLE \\d+%/)"));
check('Validation Runs uses its current player-facing label', spec.includes("name: 'VALIDATION RUNS'"));
check('Landing Practice uses its current player-facing label', spec.includes("name: 'LANDING PRACTICE'"));
check('Touch controls cover both flight directions', spec.includes("name: 'Turn / Fly Left'") && spec.includes("name: 'Turn / Fly Right'"));

const consumerCommand = packageJson.scripts?.['test:e2e:consumer'] ?? '';
check('Consumer suite excludes only named internal-development contracts', consumerCommand === 'playwright test --grep-invert "isolated internal validation|Stage 2 campaign balance|external mission document"');

const failures = checks.filter(({ passed }) => !passed).map(({ name }) => name);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildId: RELEASE_INFO.buildId,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  declaredScenarios: declaredTests,
  projectExecutions: declaredTests * 2,
  justifiedProjectSkips: skipCalls.length,
  checks,
  failures,
};

mkdirSync(resolve('reports/browser-contracts'), { recursive: true });
writeFileSync(resolve('reports/browser-contracts/audit.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const result of checks) console.log(`${result.passed ? 'PASS' : 'FAIL'}  ${result.name}`);
console.log(`\nBrowser contract audit: ${report.status} (${declaredTests} scenarios; ${skipCalls.length} justified project skips)`);
if (failures.length > 0) process.exitCode = 1;
