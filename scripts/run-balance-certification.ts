import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runBalanceCertification } from '../src/game/BalanceCertification';

const report = runBalanceCertification();
const outputDirectory = join(process.cwd(), 'reports');
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'balance-certification.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(outputDirectory, 'balance-certification.md'), renderMarkdown(report), 'utf8');

console.log(`Balance certification: ${report.passed ? 'PASS' : 'FAIL'}`);
console.log(`Campaign matrix: ${report.campaignEntries.length} entries`);
console.log(`Operation deployments: ${report.deployments.length}/6`);
console.log(`Encounter checks: ${report.encounters.length}/9`);
console.log(`Issues: ${report.issues.length}`);
if (!report.passed) process.exitCode = 1;

function renderMarkdown(value: ReturnType<typeof runBalanceCertification>): string {
  const lines = [
    '# Automated Balance Certification',
    '',
    `Generated: ${value.generatedAt}`,
    '',
    `Result: **${value.passed ? 'PASS' : 'FAIL'}**`,
    '',
    'This report proves deterministic combat behaviour, objective/loadout sufficiency, safe opening separation and valid recovery definitions. It complements rather than replaces the human playtest matrix.',
    '',
    '## Campaign matrix',
    '',
    '| Difficulty | Missions | Errors |',
    '| --- | ---: | ---: |',
    ...(['ARCADE', 'PILOT', 'VETERAN'] as const).map((difficulty) => `| ${difficulty} | ${value.campaignEntries.filter((entry) => entry.difficulty === difficulty).length} | ${value.campaignEntries.filter((entry) => entry.difficulty === difficulty).flatMap((entry) => entry.issues).filter((issue) => issue.severity === 'ERROR').length} |`),
    '',
    '## Dynamic Operations matrix',
    '',
    '| Difficulty | Seeds | Archetypes covered |',
    '| --- | --- | ---: |',
    ...(['ARCADE', 'PILOT', 'VETERAN'] as const).map((difficulty) => `| ${difficulty} | ${value.deployments.filter((entry) => entry.difficulty === difficulty).map((entry) => entry.seed).join(', ')} | ${value.coveredArchetypes[difficulty].length}/6 |`),
    '',
    '## Encounter matrix',
    '',
    '| Difficulty | Scenario | Deterministic | Firings | SAM launches | Max pitch |',
    '| --- | --- | --- | ---: | ---: | ---: |',
    ...value.encounters.map((entry) => `| ${entry.difficulty} | ${entry.scenario} | ${entry.deterministic ? 'Yes' : 'No'} | ${entry.firingEvents} | ${entry.samLaunches} | ${entry.maximumPitchDegrees.toFixed(1)}° |`),
    '',
    '## Issues',
    '',
    ...(value.issues.length ? value.issues.map((issue) => `- **${issue.severity}** ${issue.scope}: ${issue.message}`) : ['No automated blockers found.']),
    '',
  ];
  return `${lines.join('\n')}\n`;
}
