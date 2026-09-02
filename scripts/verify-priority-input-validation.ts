import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { verifyPriorityInputEvidenceExport } from '../src/game/Validation';

const inputPath = process.env.PRIORITY_INPUT_EVIDENCE || join('reports', 'playability', 'priority-input-evidence.json');
let parsed: unknown = null;
let readIssue: string | null = null;
try {
  parsed = JSON.parse(await readFile(inputPath, 'utf8'));
} catch (error) {
  readIssue = `Evidence file could not be read: ${error instanceof Error ? error.message : String(error)}`;
}

const verification = verifyPriorityInputEvidenceExport(parsed, RELEASE_INFO.buildId);
const issues = readIssue ? [readIssue, ...verification.issues] : verification.issues;
const passed = !readIssue && verification.passed;
const outputDirectory = dirname(inputPath);
await mkdir(outputDirectory, { recursive: true });
const report = {
  version: 1,
  buildId: RELEASE_INFO.buildId,
  inputPath,
  passed,
  generatedAt: new Date().toISOString(),
  summary: verification.summary,
  issues,
};
await writeFile(join(outputDirectory, 'priority-input-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(outputDirectory, 'priority-input-report.md'), [
  '# Priority physical input validation',
  '',
  `Build: ${RELEASE_INFO.buildId}`,
  `Status: ${passed ? 'PASS' : 'PENDING'}`,
  `Coverage: ${verification.summary.passedScenarioIds.length}/3 certified`,
  '',
  ...(issues.length ? issues.map((issue) => `- ${issue}`) : ['- Keyboard, gamepad and touch priority runs certified.']),
  '',
].join('\n'), 'utf8');
console.log(`Priority physical input validation: ${passed ? 'PASS' : 'PENDING'} (${verification.summary.passedScenarioIds.length}/3)`);
if (!passed) process.exitCode = 1;
