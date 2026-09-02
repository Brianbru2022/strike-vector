import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { verifyPlaytestEvidenceExport } from '../src/game/Validation';

const root = process.cwd();
const argumentIndex = process.argv.indexOf('--evidence');
const inputPath = resolve(root, argumentIndex >= 0 && process.argv[argumentIndex + 1]
  ? process.argv[argumentIndex + 1]
  : join('reports', 'stage-1', 'playtest-evidence.json'));
const directory = join(root, 'reports', 'stage-1');
await mkdir(directory, { recursive: true });
let parsed: unknown = null;
let readError: string | null = null;
try { parsed = JSON.parse(await readFile(inputPath, 'utf8')); }
catch (error) { readError = error instanceof Error ? error.message : String(error); }
const verification = verifyPlaytestEvidenceExport(parsed, RELEASE_INFO.buildId);
if (readError) verification.issues.unshift(`Evidence file could not be read: ${readError}`);
verification.passed = verification.issues.length === 0 && verification.summary.signOffReady;
const report = { version: 1, generatedAt: new Date().toISOString(), inputPath, ...verification };
await writeFile(join(directory, 'human-validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const markdown = [
  '# Stage 1 Human Validation', '',
  `Build: **${report.buildId}**`,
  `Result: **${report.passed ? 'PASS' : 'PENDING'}**`,
  `Scenarios: ${report.summary.completedScenarioIds.length}/${report.summary.totalScenarios}`,
  `Victories: ${report.summary.victoryCount}/${report.summary.totalScenarios}`,
  `Warnings acknowledged: ${report.summary.warningAcknowledgedRuns}/${report.summary.warningAcknowledgementTarget}`, '',
  '## Issues', '',
  ...(report.issues.length ? report.issues.map((issue) => `- ${issue}`) : ['- None.']), '',
].join('\n');
await writeFile(join(directory, 'human-validation-report.md'), markdown, 'utf8');
console.log(`Human validation evidence: ${report.passed ? 'PASS' : 'PENDING'} (${report.summary.completedScenarioIds.length}/${report.summary.totalScenarios})`);
if (!report.passed) process.exitCode = 1;
