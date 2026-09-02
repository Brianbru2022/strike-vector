import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve } from 'node:path';
import { AUDIO_CUE_DEFINITIONS } from '../src/audio/SoundEngine';
import { RELEASE_INFO } from '../src/game/Release';

const root = resolve('dist-demo');
const files = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
const issues: string[] = [];
if (!existsSync(root)) throw new Error('dist-demo does not exist; run pnpm demo:build first.');
const outputFiles = files(root);
const totalBytes = outputFiles.reduce((sum, file) => sum + statSync(file).size, 0);
for (const required of ['index.html', 'sw.js', 'manifest.webmanifest', 'commercial-edition.html', 'demo-asset-manifest.json']) if (!existsSync(join(root, required))) issues.push(`Missing ${required}.`);
const forbidden = outputFiles.map((file) => relative(root, file).replaceAll('\\', '/')).filter((file) => /bastion|janus|arctic|north-cape|airbase|bridgehead|campaign-map/i.test(file));
if (forbidden.length) issues.push(`Late-game assets leaked into demo: ${forbidden.join(', ')}`);
const html = readFileSync(join(root, 'index.html'), 'utf8');
if (!html.includes("Iron Kestrel '87 Demo")) issues.push('Served title is not the focused demo.');
const manifest = JSON.parse(readFileSync(join(root, 'demo-asset-manifest.json'), 'utf8')) as { version?: number; buildId?: string; budgetBytes?: number; assets?: string[]; bytes?: number; sha256ByAsset?: Record<string, string>; fingerprint?: string };
const budgetBytes = manifest.budgetBytes ?? 15 * 1024 * 1024;
if (totalBytes >= budgetBytes) issues.push(`Demo output is ${(totalBytes / 1024 / 1024).toFixed(2)} MB; limit is below ${(budgetBytes / 1024 / 1024).toFixed(0)} MB.`);
if (!Array.isArray(manifest.assets) || manifest.assets.length < 20) issues.push('Demo asset manifest is missing or incomplete.');
if (manifest.version !== 1 || manifest.buildId !== RELEASE_INFO.buildId) issues.push(`Demo manifest does not belong to ${RELEASE_INFO.buildId}.`);
const listedAssets = manifest.assets ?? [];
if (new Set(listedAssets).size !== listedAssets.length) issues.push('Demo asset manifest contains duplicate entries.');
const requiredAudio = Object.values(AUDIO_CUE_DEFINITIONS).flatMap((cue) => cue.samplePath ? [cue.samplePath.replace(/^\//, '')] : []);
for (const asset of requiredAudio) if (!listedAssets.includes(asset)) issues.push(`Production audio cue is absent from demo: ${asset}.`);
const actualAssetBytes = listedAssets.reduce((sum, asset) => sum + (existsSync(join(root, asset)) ? statSync(join(root, asset)).size : 0), 0) + statSync(join(root, 'commercial-edition.html')).size;
if (manifest.bytes !== actualAssetBytes) issues.push(`Demo asset byte count is ${manifest.bytes}; actual is ${actualAssetBytes}.`);
for (const asset of listedAssets) {
  const file = join(root, asset);
  if (!existsSync(file)) { issues.push(`Manifest asset is missing: ${asset}.`); continue; }
  const checksum = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (manifest.sha256ByAsset?.[asset] !== checksum) issues.push(`Checksum mismatch: ${asset}.`);
}
const expectedFingerprint = createHash('sha256').update(JSON.stringify({ assets: listedAssets, sha256ByAsset: manifest.sha256ByAsset ?? {} })).digest('hex');
if (manifest.fingerprint !== expectedFingerprint) issues.push('Demo asset fingerprint is invalid.');
if (existsSync(join(root, 'sw.js'))) {
  const serviceWorker = readFileSync(join(root, 'sw.js'), 'utf8');
  for (const asset of listedAssets) {
    if (!serviceWorker.includes(`url:"${asset}"`) && !serviceWorker.includes(`url:'${asset}'`)) {
      issues.push(`Offline precache is missing manifest asset: ${asset}.`);
    }
  }
  if (!serviceWorker.includes('commercial-edition.html')) issues.push('Offline precache is missing the Windows edition details page.');
}
const report = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, passed: issues.length === 0, totalBytes, budgetBytes, assetBytes: actualAssetBytes, assetCount: listedAssets.length, outputFileCount: outputFiles.length, fingerprint: manifest.fingerprint ?? null, issues };
mkdirSync(resolve('reports/stage8'), { recursive: true });
writeFileSync(resolve('reports/stage8/demo-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Demo build audit: ${issues.length ? 'FAIL' : 'PASS'} · ${(totalBytes / 1024 / 1024).toFixed(2)} MB total · ${outputFiles.length} files`);
for (const issue of issues) console.log(`- ${issue}`);
if (issues.length) process.exitCode = 1;
