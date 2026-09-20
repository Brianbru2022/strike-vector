import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

type BaselineManifest = {
  schemaVersion: number;
  buildId: string;
  branch: string;
  channel: string;
  buildBoundRecords: string[];
  commercialStatus: string;
  humanAndExternalGates: string;
};

type BuildBoundRecord = { buildId?: unknown };

const root = process.cwd();
const strict = process.argv.includes('--strict');
const failures: string[] = [];
const passes: string[] = [];

const readJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(resolve(root, relativePath), 'utf8')) as T;

const assert = (condition: boolean, message: string) => {
  if (condition) passes.push(message);
  else failures.push(message);
};

const manifestPath = 'config/release-engineering-baseline.json';
assert(existsSync(resolve(root, manifestPath)), `${manifestPath} exists`);

const manifest = readJson<BaselineManifest>(manifestPath);
const packageJson = readJson<{ version?: unknown; packageManager?: unknown }>('package.json');

assert(manifest.schemaVersion === 1, 'baseline manifest schema is supported');
assert(manifest.buildId === RELEASE_INFO.buildId, 'baseline manifest matches RELEASE_INFO.buildId');
assert(manifest.channel === RELEASE_INFO.channel, 'baseline manifest matches the release channel');
assert(packageJson.version === RELEASE_INFO.version, 'package version matches RELEASE_INFO.version');
assert(typeof packageJson.packageManager === 'string' && packageJson.packageManager.startsWith('pnpm@'), 'pnpm version is pinned');
assert(existsSync(resolve(root, 'pnpm-lock.yaml')), 'pnpm lockfile exists');
assert(existsSync(resolve(root, '.github/workflows/release-baseline.yml')), 'release baseline CI workflow exists');

for (const relativePath of manifest.buildBoundRecords) {
  assert(existsSync(resolve(root, relativePath)), `${relativePath} exists`);
  if (!existsSync(resolve(root, relativePath))) continue;
  const record = readJson<BuildBoundRecord>(relativePath);
  assert(record.buildId === RELEASE_INFO.buildId, `${relativePath} is bound to the current build`);
}

assert(manifest.commercialStatus === 'NOT_CERTIFIED', 'commercial status remains truthful');
assert(manifest.humanAndExternalGates === 'PENDING', 'human and external gates remain pending');

if (strict) {
  const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
  assert(branch === manifest.branch, `current branch is ${manifest.branch}`);
  assert(status.length === 0, 'working tree is clean');
}

for (const message of passes) console.log(`PASS  ${message}`);
for (const message of failures) console.error(`FAIL  ${message}`);

if (failures.length > 0) {
  console.error(`\nRelease engineering baseline failed with ${failures.length} issue(s).`);
  process.exitCode = 1;
} else {
  console.log(`\nRelease engineering baseline verified for ${RELEASE_INFO.buildId}${strict ? ' with a clean local branch' : ''}.`);
}
