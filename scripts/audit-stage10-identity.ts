import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const blockers: string[] = [];
const checks: Array<[string, RegExp]> = [
  ['index.html', /<title>Iron Kestrel '87: North Atlantic Air War<\/title>/],
  ['src-tauri/tauri.conf.json', /Iron Kestrel '87/],
  ['docs/STORE_PAGE.md', /Iron Kestrel '87/],
  ['config/storefront-claims.json', /Iron Kestrel '87/],
  ['src/game/Demo.ts', /IRON KESTREL '87 DEMO/],
];
for (const [file, pattern] of checks) {
  const absolute = path.join(root, file);
  if (!existsSync(absolute) || !pattern.test(readFileSync(absolute, 'utf8'))) blockers.push(`${file} does not carry the approved product identity.`);
}
if (strict && String(RELEASE_INFO.channel) !== 'RELEASE_CANDIDATE') blockers.push('Strict identity certification requires a release-candidate channel.');
if (!strict && !['DEVELOPMENT', 'RELEASE_CANDIDATE'].includes(RELEASE_INFO.channel)) blockers.push('The release channel is unsupported.');
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, status: blockers.length ? 'BLOCKED' : 'PASS', blockers };
const output = path.join(root, 'reports/stage10/identity-audit.json');
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Stage 10 identity audit: ${report.status}`);
blockers.forEach((item) => console.error(`BLOCKER: ${item}`));
if (blockers.length) process.exitCode = 1;
