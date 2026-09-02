import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { Stage4ControlEvidenceV1, verifyStage4ControlEvidence } from '../src/game/Stage4ControlCertification';

const evidencePath = resolve(process.argv[2] ?? 'reports/stage-4/control-certification-evidence.json');
const reportPath = resolve('reports/stage-4/control-certification-verification.json');
const evidence = existsSync(evidencePath)
  ? JSON.parse(readFileSync(evidencePath, 'utf8')) as Stage4ControlEvidenceV1
  : { version: 1, buildId: RELEASE_INFO.buildId, completedAt: null, runs: [] } as Stage4ControlEvidenceV1;
const result = verifyStage4ControlEvidence(evidence);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, ...result }, null, 2)}\n`);
console.log(`Stage 4 hardware control certification: ${result.passed ? 'PASS' : 'PENDING'}`);
for (const issue of result.issues) console.log(`- ${issue}`);
if (!result.passed) process.exitCode = 1;

