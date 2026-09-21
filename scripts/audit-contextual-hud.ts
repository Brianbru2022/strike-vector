import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { HUD_INFORMATION_MODEL } from '../src/game/HudContext';
import { RELEASE_INFO } from '../src/game/Release';

const issues: string[] = [];
const hud = await readFile(resolve('src/components/HUD.tsx'), 'utf8');
const context = await readFile(resolve('src/game/HudContext.ts'), 'utf8');

const requiredContracts = [
  ['HUD exposes its current visibility mode', 'data-hud-mode={hudVisibility.mode}'],
  ['Current objective remains visible', 'OBJ: {currentObjective.description}'],
  ['Active weapon remains visible', 'ACTIVE WEAPON'],
  ['Mobile essential status remains visible', 'Essential aircraft and weapon status'],
  ['Expanded detail is explicitly toggleable', 'Toggle expanded HUD detail (I)'],
  ['Map progress is contextual', 'hudVisibility.mapProgress'],
  ['Score is contextual', 'hudVisibility.scoreDetail'],
  ['Flight tapes are contextual', 'hudVisibility.detailedFlight'],
  ['Subsystem detail is warning-led', 'hudVisibility.subsystemDetail'],
  ['Weapon inventory is contextual', 'hudVisibility.weaponDetail'],
] as const;

for (const [label, marker] of requiredContracts) {
  if (!hud.includes(marker)) issues.push(`${label}: missing ${marker}`);
}
if (!context.includes("mode: expanded ? 'EXPANDED' : contextual ? 'CONTEXTUAL' : 'ESSENTIAL'")) {
  issues.push('HUD context authority does not expose deterministic essential/contextual/expanded modes.');
}

const categories = new Set(Object.values(HUD_INFORMATION_MODEL) as string[]);
for (const category of ['ALWAYS_REQUIRED', 'CONTEXT_REQUIRED', 'WARNING_ONLY', 'OPTIONAL_EXPANDED']) {
  if (!categories.has(category)) issues.push(`HUD information model is missing ${category}.`);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildId: RELEASE_INFO.buildId,
  automatedPassed: issues.length === 0,
  informationModel: HUD_INFORMATION_MODEL,
  modes: {
    essential: 'Aircraft condition, current objective and selected weapon remain visible.',
    contextual: 'Flight, weapon, damage, threat and mission panels appear only when their gameplay context requires them.',
    expanded: 'Player-requested score, map, inventory and detailed instrumentation.',
  },
  runtimeContracts: requiredContracts.map(([label, marker]) => ({ label, marker, present: hud.includes(marker) })),
  issues,
};

const output = resolve('reports', 'milestone-8');
await mkdir(output, { recursive: true });
await writeFile(join(output, 'contextual-hud-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(join(output, 'contextual-hud-audit.md'), [
  '# Milestone 8 contextual HUD audit', '',
  `Build: \`${RELEASE_INFO.buildId}\``, '',
  `Automated audit: **${report.automatedPassed ? 'PASS' : 'FAIL'}**`, '',
  '| Tier | Content |', '| --- | --- |',
  '| Always required | Aircraft condition, current objective, active weapon |',
  '| Context required | Detailed flight data, weapon inventory, recovery and mission-specific guidance |',
  '| Warning only | Subsystem damage, missile threats, dangerous fuel |',
  '| Optional / expanded | Map progress, score breakdown and full instrumentation |', '',
  'Press `I` or use **HUD DETAIL** to request the expanded display. Training controls remain recallable with `H`.', '',
  ...(issues.length ? ['## Issues', '', ...issues.map((issue) => `- ${issue}`), ''] : []),
].join('\n'), 'utf8');

console.log(`Contextual HUD audit: ${report.automatedPassed ? 'PASS' : 'FAIL'} (${requiredContracts.length} runtime contracts)`);
for (const issue of issues) console.log(`- ${issue}`);
if (!report.automatedPassed) process.exitCode = 1;
