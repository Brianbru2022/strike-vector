import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { aggregateCampaignValidationEvidence, CAMPAIGN_VALIDATION_BUILD_ID, CampaignValidationEvidenceV1, verifyCampaignValidationExport } from '../src/game/CampaignValidation';

const root = process.cwd();
const argumentIndex = process.argv.indexOf('--evidence');
const inputPath = resolve(root, argumentIndex >= 0 && process.argv[argumentIndex + 1]
  ? process.argv[argumentIndex + 1]
  : join('reports', 'stage-2', 'campaign-validation-evidence.json'));
const directory = join(root, 'reports', 'stage-2');
await mkdir(directory, { recursive: true });

let source: unknown = null;
let readError: string | null = null;
try { source = JSON.parse(await readFile(inputPath, 'utf8')); }
catch (error) { readError = error instanceof Error ? error.message : String(error); }
const verification = verifyCampaignValidationExport(source, CAMPAIGN_VALIDATION_BUILD_ID);
if (readError) verification.issues.unshift(`Evidence file could not be read: ${readError}`);
const evidence = source && typeof source === 'object' && Array.isArray((source as { evidence?: unknown }).evidence)
  ? (source as { evidence: CampaignValidationEvidenceV1[] }).evidence
  : [];
const summary = aggregateCampaignValidationEvidence(evidence);
const report = { version: 1, generatedAt: new Date().toISOString(), buildId: CAMPAIGN_VALIDATION_BUILD_ID, inputPath, passed: verification.issues.length === 0 && summary.signOffReady, summary, issues: verification.issues };
await writeFile(join(directory, 'campaign-validation-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(directory, 'campaign-validation-report.md'), [
  '# Stage 2 Campaign Validation', '',
  `Build: **${report.buildId}**`,
  `Result: **${report.passed ? 'PASS' : 'PENDING HUMAN RUNS'}**`,
  `Coverage: ${summary.completedScenarioIds.length}/${summary.totalScenarios}`,
  `Pilot missions: ${summary.pilotMissionsCovered}/16`,
  `Arcade stress passes: ${summary.arcadeStressCovered}/5`,
  `Veteran stress passes: ${summary.veteranStressCovered}/5`,
  `Victories: ${summary.victories}/${summary.totalScenarios}`,
  `Blockers: ${summary.blockers}`, '',
  '## Issues', '', ...(report.issues.length ? report.issues.map((issue) => `- ${issue}`) : ['- None.']), '',
].join('\n'), 'utf8');
console.log(`Stage 2 campaign validation: ${report.passed ? 'PASS' : 'PENDING'} (${summary.completedScenarioIds.length}/${summary.totalScenarios})`);
if (!report.passed) process.exitCode = 1;
