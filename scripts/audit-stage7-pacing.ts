import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CAMPAIGN_MISSIONS } from '../src/game/Missions';
import { auditSortiePacing } from '../src/game/SortiePacingAudit';
import { RELEASE_INFO } from '../src/game/Release';

const entries = CAMPAIGN_MISSIONS.map(auditSortiePacing);
const observations = entries.flatMap((entry) => [
  ...(entry.deadTravelRisk ? [`${entry.missionId}: ${Math.round(entry.largestContactGap)}-unit contact gap requires human review.`] : []),
  ...(entry.lateFailureRisk ? [`${entry.missionId}: ${Math.round(entry.returnDistance)}-unit final return requires human review.`] : []),
  ...(entry.longSortie && !entry.phaseRebriefAvailable ? [`${entry.missionId}: long sortie lacks phase rebrief support.`] : []),
]);
const report = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, entries, observations, passed: !entries.some((entry) => entry.longSortie && !entry.phaseRebriefAvailable) };
mkdirSync(resolve('reports/stage7'), { recursive: true });
writeFileSync(resolve('reports/stage7/pacing-audit.json'), JSON.stringify(report, null, 2));
console.log(`Stage 7 pacing audit: ${report.passed ? 'PASS' : 'FAIL'} (${observations.length} human-review observations)`);
if (!report.passed) process.exitCode = 1;
