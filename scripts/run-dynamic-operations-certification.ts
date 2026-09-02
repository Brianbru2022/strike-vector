import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateOperation, generateOperationMission, generateOperationV3 } from '../src/game/DynamicOperations';
import { LOADOUT_PRESETS } from '../src/game/ServiceSystem';
import type { DifficultyPreset, OperationBlueprintV1, OperationBlueprintV2, OperationContentSet, OperationLength } from '../src/types/game';

const difficulties: DifficultyPreset[] = ['ARCADE', 'PILOT', 'VETERAN'];
const contentSets: OperationContentSet[] = ['NORTH_ATLANTIC', 'NORWEGIAN_SEA'];
const lengths: OperationLength[] = [3, 5];
const issues: string[] = [];
let deployments = 0;
let sorties = 0;

const legacyV1Hash = legacyCompatibilityHash(generateOperation(1987, 'PILOT'));
const legacyV2Hash = legacyCompatibilityHash(generateOperation(1987, 'PILOT', 2));
if (legacyV1Hash !== 4001643771) issues.push(`V1 seed fixture changed: ${legacyV1Hash}.`);
if (legacyV2Hash !== 300066680) issues.push(`V2 seed fixture changed: ${legacyV2Hash}.`);

for (let seed = 0; seed < 1000; seed++) {
  const difficulty = difficulties[seed % difficulties.length];
  for (const contentSet of contentSets) for (const sortieCount of lengths) {
    const first = generateOperationV3(seed, difficulty, contentSet, sortieCount);
    const replay = generateOperationV3(seed, difficulty, contentSet, sortieCount);
    deployments++;
    if (JSON.stringify(first) !== JSON.stringify(replay)) issues.push(`Non-deterministic V3 deployment ${seed}/${difficulty}/${contentSet}/${sortieCount}.`);
    if (new Set(first.sorties.map((sortie) => sortie.archetype)).size !== sortieCount) issues.push(`Repeated archetype in ${seed}/${contentSet}/${sortieCount}.`);
    for (let index = 0; index < sortieCount; index++) {
      sorties++;
      const sortie = first.sorties[index];
      const mission = generateOperationMission(first, index, { CARRIER: 75, FORWARD_BASE: 75 });
      const loadout = LOADOUT_PRESETS[sortie.recommendedLoadout];
      const airTargets = mission.objectives.filter((objective) => objective.isPrimary && ['PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI'].includes(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
      const groundTargets = mission.objectives.filter((objective) => objective.isPrimary && !['LANDING', 'DEFEND_ASSET', 'PATROL_FIGHTER', 'INTERCEPTOR', 'ATTACK_HELI', 'DOWNED_PILOT'].includes(objective.targetType)).reduce((sum, objective) => sum + objective.requiredCount, 0);
      if (mission.carrierLandingX < 0 || mission.carrierLandingX > mission.mapLength) issues.push(`Invalid recovery in ${mission.id}.`);
      if (mission.spawnEnemies().some((enemy) => enemy.x < 0 || enemy.x > mission.mapLength)) issues.push(`Out-of-bounds force in ${mission.id}.`);
      if (loadout.missiles + Math.floor(loadout.rockets / 2) < airTargets || loadout.bombs + Math.floor(loadout.rockets / 2) < groundTargets) issues.push(`Insufficient recommended loadout in ${mission.id}.`);
      if (sortie.modifiers?.includes('DAMAGED_RUNWAY') && sortie.recoverySite !== 'FORWARD_BASE') issues.push(`Damaged runway assigned to carrier in ${mission.id}.`);
    }
  }
}

const uniqueIssues = [...new Set(issues)];
const report = { version: 1, generatedAt: new Date().toISOString(), passed: uniqueIssues.length === 0, legacyFixtures: { v1: legacyV1Hash, v2: legacyV2Hash }, deployments, sorties, issues: uniqueIssues };
const outputDirectory = join(process.cwd(), 'reports', 'milestone-18');
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'certification.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(outputDirectory, 'certification.md'), [
  '# Milestone 18 Dynamic Operations 2.0 Certification', '',
  `Result: **${report.passed ? 'PASS' : 'FAIL'}**`,
  `Generated: ${report.generatedAt}`, '',
  `- V1 fixture hash: **${legacyV1Hash}**`,
  `- V2 fixture hash: **${legacyV2Hash}**`,
  `- V3 deployments audited: **${deployments.toLocaleString()}**`,
  `- V3 sorties audited: **${sorties.toLocaleString()}**`, '',
  '## Issues', '', ...(uniqueIssues.length ? uniqueIssues.map((issue) => `- ${issue}`) : ['No deterministic generation, placement, recovery, modifier or ammunition blockers found.']), '',
].join('\n'), 'utf8');
console.log(`Dynamic Operations 2.0 certification: ${report.passed ? 'PASS' : 'FAIL'}`);
console.log(`Legacy fixtures: V1 ${legacyV1Hash}; V2 ${legacyV2Hash}`);
console.log(`V3 coverage: ${deployments} deployments / ${sorties} sorties; issues: ${uniqueIssues.length}`);
if (!report.passed) process.exitCode = 1;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * The Stage 1 branding migration deliberately changed shared codes from SV- to
 * IK- without changing the operation they identify. Normalise only that
 * display prefix before comparing the historical V1/V2 fixtures so any
 * gameplay-content drift still fails certification.
 */
function legacyCompatibilityHash(operation: OperationBlueprintV1 | OperationBlueprintV2): number {
  return stableHash(JSON.stringify({
    ...operation,
    seedCode: operation.seedCode.replace(/^IK-/, 'SV-'),
  }));
}
