import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  compileMissionAuthoringDocument,
  createBlankMissionDocument,
  createMissionAuthoringDocument,
  exportMissionAuthoringJson,
  parseMissionAuthoringJson,
  validateMissionAuthoringDocument,
} from '../src/game/MissionAuthoring';
import { missionPresentationArtwork } from '../src/game/MissionPresentation';
import { CAMPAIGN_MISSIONS } from '../src/game/Missions';
import { RELEASE_INFO } from '../src/game/Release';

const outputDirectory = join(process.cwd(), 'reports', 'milestone-19');
const knownBackdrops = new Set(CAMPAIGN_MISSIONS.flatMap((mission) => [
  missionPresentationArtwork(mission),
  ...(mission.presentation?.backdropAsset ? [mission.presentation.backdropAsset] : []),
]));
const issues: string[] = [];
let objectives = 0;
let events = 0;
let enemies = 0;

for (const mission of CAMPAIGN_MISSIONS) {
  const source = createMissionAuthoringDocument(mission);
  const roundTrip = parseMissionAuthoringJson(exportMissionAuthoringJson(source));
  const validation = validateMissionAuthoringDocument(roundTrip, knownBackdrops);
  issues.push(...validation.filter((issue) => issue.severity === 'ERROR').map((issue) => `${mission.id} ${issue.code}: ${issue.message}`));
  objectives += roundTrip.mission.objectives.length;
  events += roundTrip.mission.events?.length || 0;
  enemies += roundTrip.enemies.length;
  try {
    const compiled = compileMissionAuthoringDocument(roundTrip, knownBackdrops);
    if (JSON.stringify(compiled.spawnEnemies()) !== JSON.stringify(compiled.spawnEnemies())) issues.push(`${mission.id} produced non-deterministic initial units.`);
    if (compiled.spawnEnemies() === compiled.spawnEnemies()) issues.push(`${mission.id} reused a mutable enemy array.`);
  } catch (error) {
    issues.push(`${mission.id} did not compile: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const cleanMission = createBlankMissionDocument(CAMPAIGN_MISSIONS[0]);
const cleanValidation = validateMissionAuthoringDocument(cleanMission, knownBackdrops);
issues.push(...cleanValidation.filter((issue) => issue.severity === 'ERROR').map((issue) => `clean mission ${issue.code}: ${issue.message}`));
const cleanCompiled = compileMissionAuthoringDocument(cleanMission, knownBackdrops);
if (cleanCompiled.id !== 'authoring_test_mission') issues.push('Clean authoring scenario compiled with the wrong identifier.');

const uniqueIssues = [...new Set(issues)];
const report = {
  version: 1,
  buildIdentifier: RELEASE_INFO.buildId,
  generatedAt: new Date().toISOString(),
  passed: uniqueIssues.length === 0,
  authoringDocumentVersion: cleanMission.version,
  campaignMissionsRoundTripped: CAMPAIGN_MISSIONS.length,
  objectivesValidated: objectives,
  eventsValidated: events,
  initialUnitsValidated: enemies,
  cleanMissionCompiled: cleanCompiled.id,
  issues: uniqueIssues,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'authoring-test-mission.mission.json'), exportMissionAuthoringJson(cleanMission), 'utf8');
await writeFile(join(outputDirectory, 'certification.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(outputDirectory, 'certification.md'), [
  '# Milestone 19 Mission Authoring Certification',
  '',
  `Build: **${report.buildIdentifier}**`,
  `Generated: ${report.generatedAt}`,
  `Result: **${report.passed ? 'PASS' : 'FAIL'}**`,
  '',
  `- Campaign missions round-tripped: **${report.campaignMissionsRoundTripped}**`,
  `- Objectives validated: **${report.objectivesValidated}**`,
  `- Events validated: **${report.eventsValidated}**`,
  `- Initial units validated: **${report.initialUnitsValidated}**`,
  `- Clean external mission compiled: **${report.cleanMissionCompiled}**`,
  '',
  '## Issues',
  '',
  ...(uniqueIssues.length ? uniqueIssues.map((issue) => `- ${issue}`) : ['No schema, reference, deterministic spawn, placement, opening, recovery or asset blockers found.']),
  '',
].join('\n'), 'utf8');

console.log(`Mission authoring certification: ${report.passed ? 'PASS' : 'FAIL'}`);
console.log(`Round-tripped ${report.campaignMissionsRoundTripped} missions, ${objectives} objectives, ${events} events and ${enemies} initial units.`);
console.log(`Clean external mission: ${cleanCompiled.id}; issues: ${uniqueIssues.length}`);
if (!report.passed) process.exitCode = 1;
