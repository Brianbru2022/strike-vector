import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CAMPAIGN_MISSIONS } from '../src/game/Missions';
import { Stage7BalanceEvidenceV1, verifyStage7Evidence } from '../src/game/Stage7Balance';
import { RELEASE_INFO } from '../src/game/Release';

const evidencePath = resolve(process.argv[2] ?? 'reports/stage7/human-balance-evidence.json');
const reportPath = resolve('reports/stage7/verification.json');
const markdownPath = resolve('reports/stage7/verification.md');
let evidence: Stage7BalanceEvidenceV1 = { version: 1, buildId: RELEASE_INFO.buildId, generatedAt: new Date(0).toISOString(), runs: [], humanReviews: [] };
if (existsSync(evidencePath)) evidence = JSON.parse(readFileSync(evidencePath, 'utf8')) as Stage7BalanceEvidenceV1;
const result = verifyStage7Evidence(evidence, CAMPAIGN_MISSIONS.map((mission) => mission.id));
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), ...result }, null, 2));
writeFileSync(markdownPath, renderMarkdown(result));
console.log(`Stage 7 human balance evidence: ${result.passed ? 'PASS' : 'PENDING'}`);
for (const issue of result.issues.slice(0, 20)) console.log(`- ${issue}`);
if (result.issues.length > 20) console.log(`- ...and ${result.issues.length - 20} more.`);
if (!result.passed) process.exitCode = 1;

function renderMarkdown(value: ReturnType<typeof verifyStage7Evidence>): string {
  const lines = [
    '# Stage 7 human balance verification', '',
    `Build: **${value.buildId}**`, '',
    `Result: **${value.passed ? 'PASS' : 'PENDING'}**`, '',
    '| Difficulty | Attempts | Victories | Completion | Avg sortie | Avg combat | Warning response | Deployments | Archetypes |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...(['ARCADE', 'PILOT', 'VETERAN'] as const).map((difficulty) => {
      const metrics = value.metricsByDifficulty[difficulty];
      return `| ${difficulty} | ${metrics.attempts} | ${metrics.victories} | ${metrics.completionRate}% | ${metrics.averageSortieSeconds}s | ${metrics.averageCombatSeconds}s | ${metrics.warningAcknowledgementRate}% | ${value.completedDeployments[difficulty]}/2 | ${value.coveredArchetypes[difficulty].length}/6 |`;
    }),
    '', '## Issues', '',
    ...(value.issues.length ? value.issues.map((issue) => `- ${issue}`) : ['No unresolved balance issues.']), '',
  ];
  return `${lines.join('\n')}\n`;
}
