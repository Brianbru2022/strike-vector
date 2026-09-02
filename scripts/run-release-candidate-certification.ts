import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runBalanceCertification } from '../src/game/BalanceCertification';
import { createDefaultCampaignSave, sanitiseCampaignSave } from '../src/game/Campaign';
import { generateOperation, generateOperationMission, generateOperationV3 } from '../src/game/DynamicOperations';
import { missionPresentationArtwork } from '../src/game/MissionPresentation';
import { CAMPAIGN_MISSIONS } from '../src/game/Missions';
import { RELEASE_FREEZE_RULES, RELEASE_INFO } from '../src/game/Release';
import type { DifficultyPreset } from '../src/types/game';

const outputDirectory = join(process.cwd(), 'reports', 'release-candidate');
const publicLimitBytes = 45 * 1024 * 1024;
const difficulties: DifficultyPreset[] = ['ARCADE', 'PILOT', 'VETERAN'];
const issues: string[] = [];
const packageJson = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as { version?: string };

if (packageJson.version !== RELEASE_INFO.version) issues.push(`Package version ${packageJson.version ?? 'missing'} does not match ${RELEASE_INFO.version}.`);
if (CAMPAIGN_MISSIONS.length !== RELEASE_INFO.campaignMissionCount) issues.push(`Expected ${RELEASE_INFO.campaignMissionCount} missions, found ${CAMPAIGN_MISSIONS.length}.`);
if (new Set(CAMPAIGN_MISSIONS.map((mission) => mission.id)).size !== CAMPAIGN_MISSIONS.length) issues.push('Campaign mission identifiers are not unique.');

for (const mission of CAMPAIGN_MISSIONS) {
  if (!mission.terrainProfile) issues.push(`${mission.id} has no authoritative terrain profile.`);
  if (!missionPresentationArtwork(mission)) issues.push(`${mission.id} has no authored presentation artwork.`);
  if (!mission.hasCarrierRecovery || mission.carrierLandingX < 0 || mission.carrierLandingX > mission.mapLength) issues.push(`${mission.id} has an invalid recovery surface.`);
}

const migrationResults = [1, 2, 3, 4].map((version) => {
  const source = {
    ...createDefaultCampaignSave(),
    version,
    completedMissionIds: ['m1_coastal_strike'],
    bestScores: { m1_coastal_strike: 1987 },
    difficulty: 'VETERAN',
    aircraftCondition: { health: 73, fuel: 0.61, flares: 3, subsystems: { engine: 0.8, flightControls: 0.9, avionics: 0.7 } },
  };
  const migrated = sanitiseCampaignSave(source);
  const passed = migrated.version === RELEASE_INFO.saveVersion
    && migrated.completedMissionIds.includes('m1_coastal_strike')
    && migrated.bestScores.m1_coastal_strike === 1987
    && migrated.difficulty === 'VETERAN';
  if (!passed) issues.push(`Campaign V${version} migration lost progression or settings.`);
  return { fromVersion: version, toVersion: migrated.version, passed };
});

const operationResults = RELEASE_INFO.operationGenerationVersions.flatMap((version) => difficulties.flatMap((difficulty) => {
  const variants = version === 3
    ? [generateOperationV3(1987, difficulty, 'NORTH_ATLANTIC', 3), generateOperationV3(1987, difficulty, 'NORWEGIAN_SEA', 5)]
    : [version === 1 ? generateOperation(1987, difficulty) : generateOperation(1987, difficulty, 2)];
  return variants.map((first) => {
    const second = first.version === 1 ? generateOperation(1987, difficulty) : first.version === 2 ? generateOperation(1987, difficulty, 2) : generateOperationV3(1987, difficulty, first.contentSet, first.sortieCount);
    const deterministic = JSON.stringify(first) === JSON.stringify(second);
    const validSorties = first.sorties.length === (first.version === 3 ? first.sortieCount : 3) && first.sorties.every((_, index) => Boolean(generateOperationMission(first, index)));
    if (!deterministic || !validSorties) issues.push(`Operation V${version}/${difficulty}/${first.sorties.length} failed deterministic generation.`);
    return { version, difficulty, sortieCount: first.sorties.length, deterministic, validSorties };
  });
}));

const balance = runBalanceCertification();
if (!balance.passed) issues.push('Shared campaign and encounter balance certification contains blocking errors.');

const requiredMedia = [
  'reports/showcase-media/01-carrier-qualification.png',
  'reports/showcase-media/02-fleet-defence.png',
  'reports/showcase-media/03-bastion-assault.png',
  'reports/showcase-media/north-atlantic-showcase-tour.webm',
  'reports/norwegian-release/media/11-cold-passage-desktop.png',
  'reports/norwegian-release/media/14-whiteout-rescue-mobile.png',
  'reports/norwegian-release/media/16-north-cape-assault-ultrawide.png',
  'reports/norwegian-release/media/north-cape-gameplay.webm',
];
const mediaResults = await Promise.all(requiredMedia.map(async (path) => {
  try {
    const bytes = (await stat(join(process.cwd(), path))).size;
    return { path, present: bytes > 0, bytes };
  } catch {
    issues.push(`Missing release media: ${path}.`);
    return { path, present: false, bytes: 0 };
  }
}));

const publicBytes = await directorySize(join(process.cwd(), 'public'));
if (publicBytes > publicLimitBytes) issues.push(`Runtime public pack is ${(publicBytes / 1024 / 1024).toFixed(2)} MiB; limit is 45 MiB.`);

const report = {
  version: 1,
  release: RELEASE_INFO,
  generatedAt: new Date().toISOString(),
  passed: issues.length === 0,
  campaign: { missions: CAMPAIGN_MISSIONS.length, difficultyEntries: balance.campaignEntries.length, balancePassed: balance.passed },
  migrations: migrationResults,
  operations: operationResults,
  runtimePackMiB: Number((publicBytes / 1024 / 1024).toFixed(2)),
  runtimePackLimitMiB: 45,
  media: mediaResults,
  freezeRules: RELEASE_FREEZE_RULES,
  issues,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'certification.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(outputDirectory, 'certification.md'), renderMarkdown(report), 'utf8');
console.log(`Iron Kestrel '87 ${RELEASE_INFO.displayVersion} certification: ${report.passed ? 'PASS' : 'FAIL'}`);
console.log(`Campaign: ${report.campaign.missions}/16; balance entries: ${report.campaign.difficultyEntries}; pack: ${report.runtimePackMiB}/45 MiB`);
console.log(`Save migrations: ${migrationResults.filter((entry) => entry.passed).length}/4; operation checks: ${operationResults.filter((entry) => entry.deterministic && entry.validSorties).length}/${operationResults.length}`);
console.log(`Issues: ${issues.length}`);
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
    `# Iron Kestrel '87 ${RELEASE_INFO.displayVersion} Certification`, '',
    `Build: **${RELEASE_INFO.buildId}**`, `Generated: ${value.generatedAt}`, `Automated result: **${value.passed ? 'PASS' : 'FAIL'}**`, '',
    `- Campaign matrix: **${value.campaign.difficultyEntries} entries across ${value.campaign.missions} missions**`,
    `- Save migrations: **${value.migrations.filter((entry) => entry.passed).length}/4**`,
    `- Dynamic Operations: **${value.operations.filter((entry) => entry.deterministic && entry.validSorties).length}/${value.operations.length} deterministic checks**`,
    `- Runtime asset pack: **${value.runtimePackMiB} MiB / ${value.runtimePackLimitMiB} MiB**`,
    `- Release media: **${value.media.filter((entry) => entry.present).length}/${value.media.length} present**`, '',
    '## Freeze rules', '', ...value.freezeRules.map((rule) => `- ${rule}`), '',
    '## Automated issues', '', ...(value.issues.length ? value.issues.map((issue) => `- ${issue}`) : ['No automated release blockers found.']), '',
    '> Human flight, accessibility, install and offline-recovery sign-off remains a separate release gate.', '',
  ].join('\n');
}
