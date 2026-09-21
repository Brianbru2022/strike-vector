import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DIRECTIONAL_FLIGHT_COPY, directionalActionLabel, directionalDeviceInstruction } from '../src/game/DirectionalFlightCopy';
import { RELEASE_INFO } from '../src/game/Release';

const issues: string[] = [];
const surfaces = [
  'src/components/HUD.tsx',
  'src/components/TouchControls.tsx',
  'src/components/ControlBindingsPanel.tsx',
  'src/components/HowToPlayModal.tsx',
  'src/game/TrainingDirector.ts',
];

const copy = Object.values(DIRECTIONAL_FLIGHT_COPY).join(' ');
if (/throttle/i.test(copy)) issues.push('Canonical player-facing copy still describes the horizontal control as a throttle.');
if (directionalActionLabel('THROTTLE_DOWN') !== DIRECTIONAL_FLIGHT_COPY.leftAction) issues.push('Left semantic action does not resolve to the canonical left-flight result.');
if (directionalActionLabel('THROTTLE_UP') !== DIRECTIONAL_FLIGHT_COPY.rightAction) issues.push('Right semantic action does not resolve to the canonical right-flight result.');
if (!DIRECTIONAL_FLIGHT_COPY.behaviour.includes('turns at low speed')) issues.push('The reversal behaviour is not explained in terms of its visible result.');

const deviceCopy = {
  keyboard: directionalDeviceInstruction('KEYBOARD'),
  gamepad: directionalDeviceInstruction('GAMEPAD'),
  touch: directionalDeviceInstruction('TOUCH'),
};
for (const [device, description] of Object.entries(deviceCopy)) {
  if (!/left\s*\/\s*right/i.test(description)) issues.push(`${device} instructions do not describe both left and right.`);
}

const surfaceChecks = [];
for (const relativePath of surfaces) {
  const source = await readFile(resolve(relativePath), 'utf8');
  const importsAuthority = source.includes('DIRECTIONAL_FLIGHT_COPY');
  if (!importsAuthority) issues.push(`${relativePath} does not consume the canonical directional-flight copy.`);
  const staleLiteral = /['"`]([^'"`]*(?:turn\s*\/\s*speed|brake\s*\/\s*turn|power and speed)[^'"`]*)['"`]/i.exec(source)?.[1] ?? null;
  if (staleLiteral) issues.push(`${relativePath} retains stale player-facing wording: ${staleLiteral}`);
  surfaceChecks.push({ path: relativePath, importsAuthority, staleLiteral });
}

const readme = await readFile(resolve('README.md'), 'utf8');
if (!readme.includes('choose the direction to fly')) issues.push('README controls do not explain the desired-direction model.');

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildId: RELEASE_INFO.buildId,
  automatedPassed: issues.length === 0,
  humanWordingStatus: 'PENDING_MILESTONE_5_SESSIONS',
  internalCompatibility: 'THROTTLE_DOWN and THROTTLE_UP identifiers retained for existing binding/save compatibility.',
  canonicalCopy: DIRECTIONAL_FLIGHT_COPY,
  deviceCopy,
  surfaces: surfaceChecks,
  issues,
  note: 'Automated checks prove terminology consistency only. Comprehension and preferred wording require genuine novice and experienced-player sessions.',
};

const output = resolve('reports', 'milestone-7');
await mkdir(output, { recursive: true });
await writeFile(join(output, 'directional-controls-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(output, 'directional-controls-audit.md'), [
  '# Milestone 7 directional-flight controls', '',
  `Build: \`${RELEASE_INFO.buildId}\``, '',
  `Automated terminology audit: **${report.automatedPassed ? 'PASS' : 'FAIL'}**`,
  'Human wording evidence: **PENDING MILESTONE 5 SESSIONS**', '',
  `**Control concept:** ${DIRECTIONAL_FLIGHT_COPY.concept}`, '',
  DIRECTIONAL_FLIGHT_COPY.behaviour, '',
  '| Device | Player-facing instruction |',
  '| --- | --- |',
  `| Keyboard | ${deviceCopy.keyboard} |`,
  `| Gamepad | ${deviceCopy.gamepad} |`,
  `| Touch | ${deviceCopy.touch} |`, '',
  'The legacy `THROTTLE_DOWN` and `THROTTLE_UP` identifiers remain internal so existing remaps and save archives continue to load. They are not shown as throttle controls to players.', '',
  ...(issues.length ? ['## Issues', '', ...issues.map((issue) => `- ${issue}`), ''] : []),
].join('\n'), 'utf8');

console.log(`Directional controls audit: ${report.automatedPassed ? 'PASS' : 'FAIL'} (${surfaceChecks.length} player-facing surfaces; human wording review pending)`);
for (const issue of issues) console.log(`- ${issue}`);
if (!report.automatedPassed) process.exitCode = 1;
