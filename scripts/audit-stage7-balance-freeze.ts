import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { stage7BalanceChecksum } from './stage7-balance-snapshot';

const freeze = JSON.parse(readFileSync(resolve('config/stage7-balance-freeze.json'), 'utf8')) as { version: number; buildId: string; sha256: string };
const issues: string[] = [];
if (freeze.version !== 1) issues.push('Unknown balance-freeze format.');
if (freeze.buildId !== RELEASE_INFO.buildId) issues.push(`Freeze belongs to ${freeze.buildId}, not ${RELEASE_INFO.buildId}.`);
if (freeze.sha256 !== stage7BalanceChecksum()) issues.push('Mission objectives, recovery geometry, difficulty profiles or loadouts changed after the Stage 7 freeze.');
console.log(`Stage 7 balance freeze: ${issues.length ? 'FAIL' : 'PASS'}`);
for (const issue of issues) console.log(`- ${issue}`);
if (issues.length) process.exitCode = 1;
