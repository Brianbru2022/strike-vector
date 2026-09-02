import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CAMPAIGN_CHAPTERS } from '../src/game/CampaignChapters';
import { auditSortie, runBalanceCertification } from '../src/game/BalanceCertification';
import { generateOperation, generateOperationMission } from '../src/game/DynamicOperations';
import { missionPresentationArtwork } from '../src/game/MissionPresentation';
import { CAMPAIGN_MISSIONS } from '../src/game/Missions';
import type { DifficultyPreset, OperationArchetype } from '../src/types/game';

const DIFFICULTIES: DifficultyPreset[] = ['ARCADE', 'PILOT', 'VETERAN'];
const ARCHETYPES: OperationArchetype[] = ['FLEET_CAP', 'SEAD', 'ARMOURED_INTERDICTION', 'PILOT_RESCUE', 'FARP_DEFENCE', 'DEEP_STRIKE'];
const MAX_PUBLIC_BYTES = 45 * 1024 * 1024;
const outputDirectory = join(process.cwd(), 'reports', 'norwegian-release');

const balance = runBalanceCertification();
const campaignIds = new Set(CAMPAIGN_MISSIONS.map((mission) => mission.id));
const chapterIds = Object.values(CAMPAIGN_CHAPTERS).flatMap((chapter) => chapter.missionIds);
const norwegianMissions = CAMPAIGN_CHAPTERS.NORWEGIAN_SEA.missionIds.map((missionId) => CAMPAIGN_MISSIONS.find((mission) => mission.id === missionId));
const issues: string[] = [];

if (CAMPAIGN_MISSIONS.length !== 16) issues.push(`Expected 16 campaign missions, found ${CAMPAIGN_MISSIONS.length}.`);
for (const missionId of chapterIds) if (!campaignIds.has(missionId)) issues.push(`Chapter references missing mission ${missionId}.`);
for (const mission of norwegianMissions) {
  if (!mission) continue;
  if (!missionPresentationArtwork(mission)) issues.push(`${mission.id} has no authored presentation artwork.`);
  if (!mission.terrainContact) issues.push(`${mission.id} has no authoritative terrain-contact profile.`);
  if (!mission.hasCarrierRecovery || mission.carrierLandingX < 0 || mission.carrierLandingX > mission.mapLength) issues.push(`${mission.id} has an invalid recovery definition.`);
}

const norwegianBalance = DIFFICULTIES.flatMap((difficulty) => norwegianMissions.flatMap((mission) => mission ? [auditSortie(mission, difficulty)] : []));
issues.push(...norwegianBalance.flatMap((entry) => entry.issues.filter((issue) => issue.severity === 'ERROR').map((issue) => `${issue.scope}: ${issue.message}`)));

const operationCoverage = Object.fromEntries(DIFFICULTIES.map((difficulty) => {
  const covered = new Set<OperationArchetype>();
  const auditedSeeds: number[] = [];
  for (let seed = 1; seed <= 512 && covered.size < ARCHETYPES.length; seed++) {
    const blueprint = generateOperation(seed, difficulty, 2);
    const introducesNewArchetype = blueprint.sorties.some((sortie) => !covered.has(sortie.archetype));
    if (!introducesNewArchetype) continue;
    auditedSeeds.push(seed);
    blueprint.sorties.forEach((sortie, index) => {
      covered.add(sortie.archetype);
      const certification = auditSortie(generateOperationMission(blueprint, index), difficulty, sortie.recommendedLoadout);
      issues.push(...certification.issues.filter((issue) => issue.severity === 'ERROR').map((issue) => `Norwegian operation ${issue.scope}: ${issue.message}`));
    });
  }
  const missing = ARCHETYPES.filter((archetype) => !covered.has(archetype));
  if (missing.length) issues.push(`${difficulty} Norwegian operations did not cover: ${missing.join(', ')}.`);
  return [difficulty, { seeds: auditedSeeds, archetypes: [...covered] }];
}));

const publicBytes = await directorySize(join(process.cwd(), 'public'));
if (publicBytes > MAX_PUBLIC_BYTES) issues.push(`Runtime public pack is ${(publicBytes / 1024 / 1024).toFixed(2)} MiB; the expansion limit is 45 MiB.`);
if (!balance.passed) issues.push('The shared balance certification report contains blocking errors.');

const report = {
  version: 1,
  buildIdentifier: process.env.STRIKE_VECTOR_BUILD_ID || `local-${new Date().toISOString().slice(0, 10)}`,
  generatedAt: new Date().toISOString(),
  passed: issues.length === 0,
  campaignMissionCount: CAMPAIGN_MISSIONS.length,
  norwegianMissionCount: norwegianMissions.filter(Boolean).length,
  difficultyEntries: norwegianBalance.length,
  legacyOperationsPreservedByFixture: true,
  norwegianOperationCoverage: operationCoverage,
  publicPackMiB: Number((publicBytes / 1024 / 1024).toFixed(2)),
  publicPackLimitMiB: 45,
  issues,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'certification.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(outputDirectory, 'certification.md'), renderMarkdown(report), 'utf8');
console.log(`Norwegian release certification: ${report.passed ? 'PASS' : 'FAIL'}`);
console.log(`Campaign: ${report.campaignMissionCount}/16 missions; Norwegian chapter: ${report.norwegianMissionCount}/6`);
console.log(`Expansion balance entries: ${report.difficultyEntries}; public pack: ${report.publicPackMiB}/45 MiB`);
console.log(`Issues: ${report.issues.length}`);
if (!report.passed) process.exitCode = 1;

async function directorySize(directory: string): Promise<number> {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    total += entry.isDirectory() ? await directorySize(path) : (await stat(path)).size;
  }
  return total;
}

function renderMarkdown(value: typeof report): string {
  return [
    '# Norwegian Expansion Release Certification',
    '',
    `Build: **${value.buildIdentifier}**`,
    `Generated: ${value.generatedAt}`,
    `Result: **${value.passed ? 'PASS' : 'FAIL'}**`,
    '',
    `- Campaign missions: **${value.campaignMissionCount}/16**`,
    `- Norwegian missions: **${value.norwegianMissionCount}/6**`,
    `- Norwegian difficulty entries: **${value.difficultyEntries}**`,
    `- Runtime public pack: **${value.publicPackMiB} MiB / ${value.publicPackLimitMiB} MiB**`,
    '- Legacy operation generation: **protected by exact V1 fixture**',
    '',
    '## Norwegian Dynamic Operations coverage',
    '',
    '| Difficulty | Audited seeds | Archetypes |',
    '| --- | --- | ---: |',
    ...DIFFICULTIES.map((difficulty) => {
      const entry = value.norwegianOperationCoverage[difficulty] as { seeds: number[]; archetypes: OperationArchetype[] };
      return `| ${difficulty} | ${entry.seeds.join(', ')} | ${entry.archetypes.length}/6 |`;
    }),
    '',
    '## Issues',
    '',
    ...(value.issues.length ? value.issues.map((issue) => `- ${issue}`) : ['No automated release blockers found.']),
    '',
    '> Automated certification does not replace judgement-based human balance and presentation sign-off.',
    '',
  ].join('\n');
}
