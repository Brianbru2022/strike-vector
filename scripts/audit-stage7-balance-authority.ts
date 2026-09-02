import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const authoritativeModules = ['AirCombatAI.ts', 'EnemyManager.ts', 'GameEngine.ts', 'MissionDirector.ts', 'Missions.ts', 'DynamicOperations.ts', 'PlayerAircraft.ts', 'WeaponsSystem.ts'];
const issues: string[] = [];
for (const file of authoritativeModules) {
  const source = readFileSync(resolve('src/game', file), 'utf8');
  if (/(?:this\.)?difficulty\s*={2,3}|(?:this\.)?difficulty\s*!={1,2}/.test(source)) issues.push(`${file} contains a direct difficulty branch; move the value into CombatDifficultyProfile.`);
}
console.log(`Stage 7 balance authority: ${issues.length ? 'FAIL' : 'PASS'}`);
for (const issue of issues) console.log(`- ${issue}`);
if (issues.length) process.exitCode = 1;
