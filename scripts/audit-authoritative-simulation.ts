import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const authoritativeFiles = [
  'src/game/GameEngine.ts',
  'src/game/PlayerAircraft.ts',
  'src/game/EnemyManager.ts',
  'src/game/CombatFlow.ts',
  'src/game/AirCombatAI.ts',
  'src/game/MissionDirector.ts',
  'src/game/AircraftLossSequence.ts',
  'src/game/ServiceSystem.ts',
];

const violations: Array<{ file: string; line: number; token: string }> = [];
for (const file of authoritativeFiles) {
  const source = await readFile(join(root, file), 'utf8');
  source.split(/\r?\n/).forEach((line, index) => {
    for (const token of ['Math.random(', 'Date.now(']) {
      if (line.includes(token)) violations.push({ file, line: index + 1, token });
    }
  });
}

const report = { version: 1, generatedAt: new Date().toISOString(), authoritativeFiles, violations, passed: violations.length === 0 };
const directory = join(root, 'reports', 'stage-1');
await mkdir(directory, { recursive: true });
await writeFile(join(directory, 'authoritative-simulation-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Authoritative simulation audit: ${report.passed ? 'PASS' : 'FAIL'} (${violations.length} violation(s))`);
if (!report.passed) process.exitCode = 1;
