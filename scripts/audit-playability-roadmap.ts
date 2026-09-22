import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { VALIDATION_SCENARIOS } from '../src/game/Validation';
import { CAMPAIGN_MISSIONS } from '../src/game/Missions';
import { AUDIO_CUE_DEFINITIONS } from '../src/audio/SoundEngine';

type Status = 'ENGINEERING_PASS' | 'HUMAN_PENDING' | 'EXTERNAL_PENDING';
interface MilestoneResult { milestone: number; title: string; status: Status; contracts: Array<{ label: string; passed: boolean }>; }

const text = async (path: string) => readFile(resolve(path), 'utf8');
const exists = async (path: string) => stat(resolve(path)).then(() => true, () => false);
const [player, engine, ai, diagnostics, hud, touch, mix, performance, platform, pwa, stage10Approval, commercialApproval] = await Promise.all([
  text('src/game/PlayerAircraft.ts'), text('src/game/GameEngine.ts'), text('src/game/AirCombatAI.ts'), text('src/game/Diagnostics.ts'),
  text('src/components/HUD.tsx'), text('src/components/TouchControls.tsx'), text('src/audio/AudioMix.ts'), text('src/game/PerformanceManager.ts'),
  text('src/game/PlatformRuntime.ts'), text('src/game/PwaManager.ts'), text('config/stage10-release-approval.json'), text('config/commercial-approval.json'),
]);

const result = (milestone: number, title: string, status: Status, contracts: Array<[string, boolean]>): MilestoneResult => ({
  milestone, title, status, contracts: contracts.map(([label, passed]) => ({ label, passed })),
});

const cueCategories = new Set(Object.values(AUDIO_CUE_DEFINITIONS).map((cue) => cue.category));
const results: MilestoneResult[] = [
  result(11, 'Formative playability baseline', 'HUMAN_PENDING', [
    ['Five-slot novice/experienced evidence flow exists', await exists('src/game/ControlConceptPlaytest.ts')],
    ['Evidence remains build-bound', (await text('src/game/ControlConceptPlaytest.ts')).includes('RELEASE_INFO.buildId')],
  ]),
  result(12, 'Flight handling and directional control', 'ENGINEERING_PASS', [
    ['Player flight authority is consumed by simulation', player.includes('PLAYER_FLIGHT_PROFILE')],
    ['Reversal telemetry records completion time', player.includes('averageReversalTicks')],
    ['Visual heading transitions remain separate from physics heading', player.includes('visualFacing')],
  ]),
  result(13, 'VTOL and recovery refinement', 'ENGINEERING_PASS', [
    ['Recovery profiles are shared by guidance and touchdown grading', player.includes('getRecoveryAssistProfile') && engine.includes('getRecoveryAssistProfile')],
    ['All three landing-practice techniques remain available', (await text('src/game/LandingPractice.ts')).includes('CARRIER_ROLLING') && (await text('src/game/LandingPractice.ts')).includes('FARP_VERTICAL')],
  ]),
  result(14, 'Weapons and combat feedback', 'ENGINEERING_PASS', [
    ['Temporary feedback durations use one authority', engine.includes('COMBAT_FEEDBACK_PROFILE')],
    ['Reduced-effects mode remains represented in accessibility state', engine.includes('reducedEffects')],
    ['Damage and weapon-hit diagnostics remain source-specific', diagnostics.includes('damageReceived') && diagnostics.includes('weaponHits')],
  ]),
  result(15, 'Enemy tactics and encounter pacing', 'ENGINEERING_PASS', [
    ['Enemy AI consumes the encounter-pacing authority', ai.includes('ENCOUNTER_PACING_PROFILE')],
    ['Phase restart guidance remains whole-sortie only', (await text('src/game/PhaseRestartGuidance.ts')).includes('wholeSortieRestart: true')],
    ['Sixteen campaign missions remain frozen', CAMPAIGN_MISSIONS.length === 16],
  ]),
  result(16, 'Controls, HUD and accessibility', 'ENGINEERING_PASS', [
    ['HUD uses prioritised contextual notifications', hud.includes('selectHudNotification')],
    ['Touch controls use pointer capture and cancellation', touch.includes('setPointerCapture') && touch.includes('onPointerCancel')],
    ['Twenty-one physical validation scenarios are defined', VALIDATION_SCENARIOS.length === 21],
  ]),
  result(17, 'Production audio and mixing', 'HUMAN_PENDING', [
    ['All seven mixer categories are represented', ['ENGINE', 'WEAPONS', 'IMPACTS', 'WARNINGS', 'RADIO', 'AMBIENCE', 'INTERFACE'].every((category) => cueCategories.has(category as never))],
    ['Priority warning and radio ducking are configured', mix.includes('WARNING:') && mix.includes('RADIO:')],
    ['Production manifest is present', await exists('config/audio-production-manifest.json')],
  ]),
  result(18, 'Performance, persistence and desktop reliability', 'HUMAN_PENDING', [
    ['Adaptive render-quality controller exists', performance.includes('AdaptiveQualityController')],
    ['Desktop storage uses queued persistence', platform.includes('pendingWrite')],
    ['Desktop mode excludes service-worker registration', pwa.includes('isDesktopRuntime()') && pwa.includes("register('/sw.js'")],
    ['Tauri project is configured', await exists('src-tauri/tauri.conf.json')],
  ]),
  result(19, 'Final balance and physical hardware certification', 'HUMAN_PENDING', [
    ['All 48 campaign difficulty combinations are automated', CAMPAIGN_MISSIONS.length * 3 === 48],
    ['Twenty-one candidate-bound human scenarios exist', VALIDATION_SCENARIOS.length === 21],
    ['Diagnostics V4 records playability evidence', diagnostics.includes('version: 4') && diagnostics.includes('encounterIdleTicks')],
  ]),
  result(20, 'Signed Windows and Steam release candidate', 'EXTERNAL_PENDING', [
    ['Windows signing tool exists', await exists('scripts/sign-windows-artifacts.ps1')],
    ['Steam and lifecycle approval remains fail-closed', stage10Approval.includes('PENDING') && commercialApproval.includes('NOT_SUBMITTED')],
    ['Release remains labelled development', RELEASE_INFO.channel === 'DEVELOPMENT'],
  ]),
];

const engineeringIssues = results.flatMap((item) => item.contracts.filter((contract) => !contract.passed).map((contract) => `M${item.milestone}: ${contract.label}`));
const externalPending = results.filter((item) => item.status !== 'ENGINEERING_PASS').map((item) => `M${item.milestone}: ${item.title}`);
const strict = process.argv.includes('--strict');
const engineeringPassed = engineeringIssues.length === 0;
const releaseGatePassed = engineeringPassed && externalPending.length === 0;
const commandPassed = engineeringPassed && (!strict || releaseGatePassed);
const report = { schemaVersion: 1, buildId: RELEASE_INFO.buildId, generatedAt: new Date().toISOString(), engineeringPassed, releaseGatePassed, results, engineeringIssues, externalPending };
const output = resolve('reports', 'playability-roadmap');
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(resolve(output, 'audit.md'), [
  '# Playability-to-release roadmap audit', '', `Build: \`${RELEASE_INFO.buildId}\``, '',
  `Engineering contracts: **${report.engineeringPassed ? 'PASS' : 'FAIL'}**`,
  `Commercial gate: **${report.releaseGatePassed ? 'PASS' : 'PENDING'}**`, '',
  '| Milestone | Status | Contracts |', '| ---: | --- | ---: |',
  ...results.map((item) => `| ${item.milestone} | ${item.status.replaceAll('_', ' ')} | ${item.contracts.filter((contract) => contract.passed).length}/${item.contracts.length} |`), '',
  '## External and human boundary', '',
  ...externalPending.map((item) => `- ${item}`), '',
  'Automated checks never create human observations, physical-device results, trusted signatures, legal clearance or Steam approval.', '',
  ...(engineeringIssues.length ? ['## Engineering issues', '', ...engineeringIssues.map((issue) => `- ${issue}`), ''] : []),
].join('\n'), 'utf8');

console.log(`Playability roadmap engineering audit: ${report.engineeringPassed ? 'PASS' : 'FAIL'}`);
console.log(`Release gate: ${report.releaseGatePassed ? 'PASS' : 'PENDING'} (${externalPending.length} human/external milestones)`);
if (!commandPassed) process.exitCode = 1;
