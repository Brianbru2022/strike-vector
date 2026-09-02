import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { createStage7BalanceSnapshot, stage7BalanceChecksum } from './stage7-balance-snapshot';

const output = resolve('config/stage7-balance-freeze.json');
mkdirSync(resolve('config'), { recursive: true });
writeFileSync(output, JSON.stringify({ version: 1, buildId: RELEASE_INFO.buildId, frozenAt: new Date().toISOString(), sha256: stage7BalanceChecksum(), snapshot: createStage7BalanceSnapshot() }, null, 2));
console.log(`Wrote ${output}`);
