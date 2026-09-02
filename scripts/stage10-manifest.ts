import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import type { ReleaseCandidateManifestV1, ReleaseFileDigestV1 } from '../src/game/ReleaseCandidate';

const root = process.cwd();
const normalise = (file: string) => path.relative(root, file).replaceAll('\\', '/');
const digest = (file: string): ReleaseFileDigestV1 => {
  const bytes = readFileSync(file);
  return { file: normalise(file), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
};
const walk = (directory: string): string[] => existsSync(directory) ? readdirSync(directory).sort().flatMap((name) => {
  const item = path.join(directory, name);
  return statSync(item).isDirectory() ? walk(item) : [item];
}) : [];
const aggregate = (files: ReleaseFileDigestV1[]) => createHash('sha256').update(files.map(({ file, bytes, sha256 }) => `${file}\0${bytes}\0${sha256}\n`).join('')).digest('hex');

const sourceRoots = ['src', 'src-tauri/src', 'scripts', 'tests'];
const sourceSingles = ['package.json', 'pnpm-lock.yaml', 'vite.config.ts', 'playwright.config.ts', 'tsconfig.json', 'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src-tauri/tauri.conf.json'];
const sourceFiles = [...sourceRoots.flatMap((entry) => walk(path.join(root, entry))), ...sourceSingles.map((entry) => path.join(root, entry)).filter(existsSync)]
  .filter((file) => !file.includes(`${path.sep}target${path.sep}`)).sort().map(digest);
const assetFiles = [...walk(path.join(root, 'public', 'assets')), ...walk(path.join(root, 'public', 'legal'))].sort().map(digest);
const claimsFiles = ['config/storefront-claims.json', 'config/commercial-approval.json', 'docs/STORE_PAGE.md', 'docs/AI_GENERATION_DISCLOSURE.md']
  .map((entry) => path.join(root, entry)).filter(existsSync).sort().map(digest);
const storefrontFiles = walk(path.join(root, 'marketing', 'store', 'stage9')).sort().map(digest);
const evidenceFiles = [
  'config/stage7-balance-freeze.json', 'config/stage10-release-approval.json', 'config/stage10-release-defects.json',
  'reports/stage-1/visual-manifest-audit.json', 'reports/visual-integration/manifest.json',
  'reports/stage8/demo-audit.json', 'reports/commercial-release/asset-rights-audit.json',
  'reports/commercial-release/legal-readiness.json', 'reports/commercial-release/stage9-commercial-readiness.json',
].map((entry) => path.join(root, entry)).filter(existsSync).sort().map(digest);
const windowsRoot = path.join(root, 'release-artifacts', `windows-${RELEASE_INFO.version}`);
const releaseArtefacts = walk(windowsRoot).filter((file) => path.basename(file) !== 'release-manifest.json').sort().map(digest);
const windowsManifestPath = path.join(windowsRoot, 'release-manifest.json');
const windowsManifestFingerprint = existsSync(windowsManifestPath) ? digest(windowsManifestPath).sha256 : createHash('sha256').update('').digest('hex');
let sourceCommit: string | null = null;
try { sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch { /* Source fingerprint remains authoritative outside Git. */ }

const manifest: ReleaseCandidateManifestV1 = {
  format: 'IRON_KESTREL_RELEASE_CANDIDATE_V1', generatedAt: new Date().toISOString(), product: "Iron Kestrel '87",
  version: RELEASE_INFO.version, displayVersion: RELEASE_INFO.displayVersion, buildId: RELEASE_INFO.buildId, channel: RELEASE_INFO.channel,
  releaseEligible: String(RELEASE_INFO.channel) === 'RELEASE_CANDIDATE', sourceCommit,
  sourceFingerprint: aggregate(sourceFiles), assetFingerprint: aggregate(assetFiles), claimsFingerprint: aggregate(claimsFiles),
  storefrontFingerprint: aggregate(storefrontFiles), evidenceFingerprint: aggregate(evidenceFiles), windowsManifestFingerprint,
  migrationCompatibility: {
    campaignSaveVersions: [1, 2, 3, 4], currentCampaignSaveVersion: RELEASE_INFO.saveVersion,
    operationGenerationVersions: [...RELEASE_INFO.operationGenerationVersions], operationPersistenceVersions: [1, 2],
    saveArchiveVersions: [1], demoTransferVersions: [1],
  }, sourceFiles, assetFiles, releaseArtefacts,
};
const output = path.join(root, 'release-artifacts', 'stage10', RELEASE_INFO.buildId, 'candidate-manifest.json');
mkdirSync(path.dirname(output), { recursive: true });
if (existsSync(output)) {
  const previous = JSON.parse(readFileSync(output, 'utf8')) as ReleaseCandidateManifestV1;
  for (const field of ['sourceFingerprint', 'assetFingerprint', 'claimsFingerprint', 'storefrontFingerprint', 'evidenceFingerprint', 'windowsManifestFingerprint'] as const) {
    if (previous[field] !== manifest[field]) throw new Error(`Immutable candidate ${RELEASE_INFO.buildId} changed (${field}). Assign a new build ID before replacing it.`);
  }
  console.log(`Immutable candidate already recorded: ${normalise(output)}`);
} else {
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Candidate manifest created: ${normalise(output)}`);
}
