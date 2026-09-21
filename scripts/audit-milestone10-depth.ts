import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { getAtmosphericDepthBand, getForegroundTreatment } from '../src/game/ForegroundPresentation';

const issues: string[] = [];
const enemy = await readFile(resolve('src/game/EnemyManager.ts'), 'utf8');
const weapons = await readFile(resolve('src/game/WeaponsSystem.ts'), 'utf8');
const engine = await readFile(resolve('src/game/GameEngine.ts'), 'utf8');

const contracts = [
  ['Enemy rendering receives player position', engine.includes('playerX: this.player.stats.x') && engine.includes('playerY: this.player.stats.y')],
  ['Enemy contacts calculate presentation distance', enemy.includes('distanceFromPlayer = Math.hypot')],
  ['Distant contact shadows are attenuated', enemy.includes('foregroundTreatment.shadowOpacity')],
  ['Objective and selected contacts remain critical', enemy.includes('isObjective: e.isPrimaryObjective || e.isSecondaryObjective') && enemy.includes('isSelected,')],
  ['Projectile rendering consumes distance treatment', weapons.includes("spriteKey: 'projectile'") && weapons.includes('distanceFromPlayer')],
  ['Enemy missiles retain minimum visibility', weapons.includes("p.type === 'ENEMY_MISSILE' ? Math.max(0.97")],
] as const;
for (const [label, passed] of contracts) if (!passed) issues.push(label);

const samples = [
  { distance: 120, expected: 'FOREGROUND' as const },
  { distance: 400, expected: 'ENGAGEMENT' as const },
  { distance: 800, expected: 'DISTANT' as const },
].map((sample) => ({ ...sample, actual: getAtmosphericDepthBand(sample.distance) }));
for (const sample of samples) if (sample.actual !== sample.expected) issues.push(`Distance ${sample.distance} resolved to ${sample.actual}, expected ${sample.expected}.`);

const distantOrdinary = getForegroundTreatment({ spriteKey: 'enemy_sam', ambientLight: 0.65, distanceFromPlayer: 820 });
const distantThreat = getForegroundTreatment({ spriteKey: 'enemy_sam', ambientLight: 0.65, distanceFromPlayer: 820, isThreat: true, isObjective: true, separationFilter: 'drop-shadow(0 0 5px cyan)' });
if (distantOrdinary.opacity >= 1 || !distantOrdinary.filter.includes('blur(')) issues.push('Ordinary distant contacts are not receiving restrained atmospheric softening.');
if (distantThreat.opacity < 0.95 || distantThreat.filter.includes('blur(') || !distantThreat.filter.includes('cyan')) issues.push('Critical distant contacts lose required threat readability.');

const report = {
  schemaVersion: 1,
  buildId: RELEASE_INFO.buildId,
  automatedPassed: issues.length === 0,
  depthBands: samples,
  ordinaryDistantTreatment: distantOrdinary,
  criticalDistantTreatment: distantThreat,
  contracts: contracts.map(([label, passed]) => ({ label, passed })),
  issues,
  manualAcceptanceRequired: [
    'Confirm distant aircraft feel embedded in haze while remaining identifiable in motion.',
    'Confirm distant ground installations do not appear pasted onto detailed terrain.',
    'Confirm missile and priority-objective recognition remains immediate at every supported viewport.',
  ],
};

const output = resolve('reports', 'milestone-10');
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'depth-treatment-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(resolve(output, 'depth-treatment-audit.md'), [
  '# Milestone 10 distance and atmospheric-treatment audit', '',
  `Build: \`${RELEASE_INFO.buildId}\``, '',
  `Automated audit: **${report.automatedPassed ? 'PASS' : 'FAIL'}**`, '',
  '| Distance | Band |', '| ---: | --- |',
  ...samples.map((sample) => `| ${sample.distance} | ${sample.actual} |`), '',
  '## Runtime contracts', '',
  ...report.contracts.map((contract) => `- ${contract.passed ? 'PASS' : 'FAIL'} — ${contract.label}`), '',
  '## Manual acceptance boundary', '',
  ...report.manualAcceptanceRequired.map((item) => `- ${item}`), '',
  ...(issues.length ? ['## Issues', '', ...issues.map((issue) => `- ${issue}`), ''] : []),
].join('\n'), 'utf8');

console.log(`Milestone 10 depth audit: ${report.automatedPassed ? 'PASS' : 'FAIL'} (${contracts.length} contracts)`);
for (const issue of issues) console.log(`- ${issue}`);
if (issues.length) process.exitCode = 1;
