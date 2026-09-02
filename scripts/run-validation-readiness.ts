import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { VALIDATION_BUILD_ID, VALIDATION_SCENARIOS } from '../src/game/Validation';

const missionIds = ['m1_coastal_strike', 'm6_fleet_defence', 'm10_hq_assault', 'm11_cold_passage', 'm14_whiteout_rescue', 'm16_north_cape_assault'];
const difficulties = ['ARCADE', 'PILOT', 'VETERAN'];
const deviceClasses = ['DESKTOP_KEYBOARD', 'DESKTOP_GAMEPAD', 'MOBILE_TOUCH'];
const issues: string[] = [];

if (VALIDATION_SCENARIOS.length !== 21) issues.push(`Expected 21 validation scenarios, found ${VALIDATION_SCENARIOS.length}.`);
for (const missionId of missionIds) {
  const scenarios = VALIDATION_SCENARIOS.filter((scenario) => scenario.missionId === missionId);
  for (const difficulty of difficulties) if (!scenarios.some((scenario) => scenario.difficulty === difficulty)) issues.push(`${missionId} has no ${difficulty} run.`);
  for (const deviceClass of deviceClasses) if (!scenarios.some((scenario) => scenario.deviceClass === deviceClass)) issues.push(`${missionId} has no ${deviceClass} run.`);
}
if (!VALIDATION_SCENARIOS.some((scenario) => scenario.guidedTraining)) issues.push('No guided first-mission run is defined.');
if (!VALIDATION_SCENARIOS.some((scenario) => scenario.inputProfile === 'REMAPPED')) issues.push('No remapped-control run is defined.');
if (!VALIDATION_SCENARIOS.some((scenario) => scenario.accessibility.reducedEffects && scenario.accessibility.highContrastHud)) issues.push('No reduced-effects/high-contrast run is defined.');
if (VALIDATION_SCENARIOS.filter((scenario) => scenario.requiresCombatDamage).length < 2) issues.push('Two damaged-recovery runs are required.');

const report = {
  version: 1,
  buildIdentifier: VALIDATION_BUILD_ID,
  generatedAt: new Date().toISOString(),
  toolingReady: issues.length === 0,
  humanSignOff: 'PENDING' as const,
  scenarioCount: VALIDATION_SCENARIOS.length,
  missionCount: missionIds.length,
  difficultyCount: difficulties.length,
  deviceClassCount: deviceClasses.length,
  issues,
  note: 'Automated readiness does not count as human playtest evidence. Complete the in-game Validation Runs matrix to close Milestone 11.',
};

const outputDirectory = join(process.cwd(), 'reports', 'milestone-11');
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'readiness.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(outputDirectory, 'readiness.md'), [
  '# Milestone 11 Validation Readiness',
  '',
  `Build: **${report.buildIdentifier}**`,
  `Tooling: **${report.toolingReady ? 'READY' : 'BLOCKED'}**`,
  `Human sign-off: **${report.humanSignOff}**`,
  '',
  `- Scenarios: ${report.scenarioCount}/21`,
  `- Benchmark missions: ${report.missionCount}/6`,
  `- Difficulties: ${report.difficultyCount}/3`,
  `- Control classes: ${report.deviceClassCount}/3`,
  '',
  '## Structural issues',
  '',
  ...(issues.length ? issues.map((issue) => `- ${issue}`) : ['No structural readiness problems found.']),
  '',
  `> ${report.note}`,
  '',
].join('\n'), 'utf8');

console.log(`Milestone 11 tooling readiness: ${report.toolingReady ? 'PASS' : 'FAIL'}`);
console.log(`Matrix: ${report.scenarioCount}/21 scenarios, ${report.missionCount}/6 missions, ${report.difficultyCount}/3 difficulties, ${report.deviceClassCount}/3 control classes`);
console.log(`Human sign-off: ${report.humanSignOff}`);
if (!report.toolingReady) process.exitCode = 1;
