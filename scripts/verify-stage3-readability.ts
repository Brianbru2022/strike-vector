import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { Stage3ReadabilityEvidenceV1, verifyStage3ReadabilityEvidence } from '../src/game/Stage3ReadabilityEvidence';

const evidencePath = resolve(process.argv[2] ?? 'reports/stage-3/readability-evidence.json');
const reportPath = resolve('reports/stage-3/readability-verification.json');
const evidence = existsSync(evidencePath)
  ? JSON.parse(readFileSync(evidencePath, 'utf8')) as Stage3ReadabilityEvidenceV1
  : { version: 1, buildId: RELEASE_INFO.buildId, completedAt: null, runs: [] } as Stage3ReadabilityEvidenceV1;
const result = verifyStage3ReadabilityEvidence(evidence);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, ...result }, null, 2)}\n`);
console.log(`Stage 3 human readability evidence: ${result.passed ? 'PASS' : 'PENDING'}`);
for (const issue of result.issues) console.log(`- ${issue}`);
if (!result.passed) process.exitCode = 1;

