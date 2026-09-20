import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

const root = resolve('dist-itch');
const reportRoot = resolve('reports/external-beta');
const issues: string[] = [];

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)],
  );
}

if (!existsSync(root)) throw new Error('dist-itch does not exist; run pnpm itch:build first.');
const indexPath = join(root, 'index.html');
if (!existsSync(indexPath)) issues.push('index.html is missing from the itch ZIP root.');

const outputFiles = walk(root).filter((file) => relative(root, file).replaceAll('\\', '/') !== 'itch-build-manifest.json');
const relativeFiles = outputFiles.map((file) => relative(root, file).replaceAll('\\', '/')).sort();
for (const name of relativeFiles) {
  if (name.startsWith('/') || name.includes('\\') || name.split('/').includes('..')) issues.push(`${name} is not a safe archive-relative path.`);
}
for (const forbidden of ['sw.js', 'registerSW.js', 'manifest.webmanifest']) {
  if (relativeFiles.some((file) => file === forbidden || file.endsWith(`/${forbidden}`))) {
    issues.push(`${forbidden} must not ship in the iframe-targeted itch build.`);
  }
}

const textFiles = outputFiles.filter((file) => /\.(?:html|css|js)$/i.test(file));
const textOutput = textFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
for (const file of textFiles) {
  const source = readFileSync(file, 'utf8');
  const name = relative(root, file).replaceAll('\\', '/');
  if (/(?:src|href)=["']\/(?!\/)/i.test(source)) issues.push(`${name} contains a root-relative HTML URL.`);
  if (/(["'`(])\/(?:assets|legal)\//.test(source)) issues.push(`${name} contains a root-relative runtime asset URL.`);
  if (/__STRIKE_VECTOR_VALIDATION__|__STRIKE_VECTOR_AUTHORING__|VALIDATION RUNS|EARLY CONTROL-CONCEPT TEST|MISSION AUTHORING/.test(source)) {
    issues.push(`${name} contains an internal-only tool marker.`);
  }
}
const indexHtml = readFileSync(indexPath, 'utf8');
for (const match of indexHtml.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
  const url = match[1];
  if (!/^(?:https?:|data:|#)/i.test(url) && !url.startsWith('./')) issues.push(`index.html reference is not explicitly relative: ${url}`);
}

const assetClasses = {
  images: relativeFiles.filter((file) => /\.(?:png|jpe?g|webp)$/i.test(file)).length,
  audio: relativeFiles.filter((file) => /\.wav$/i.test(file)).length,
  scripts: relativeFiles.filter((file) => /\.js$/i.test(file)).length,
};
if (assetClasses.images === 0) issues.push('The itch build contains no packaged image assets.');
if (assetClasses.audio === 0) issues.push('The itch build contains no packaged audio assets.');
if (assetClasses.scripts < 2) issues.push('The itch build is missing expected JavaScript chunks.');
let configuredFeedbackUrl: string | null = null;
try {
  const approval = JSON.parse(readFileSync(resolve('config/external-beta-approval.json'), 'utf8')) as { feedbackRoute?: { url?: unknown } };
  configuredFeedbackUrl = typeof approval.feedbackRoute?.url === 'string' && approval.feedbackRoute.url.trim() ? approval.feedbackRoute.url.trim() : null;
} catch { /* The external-beta gate reports a malformed approval file separately. */ }
const feedbackUrlEmbedded = configuredFeedbackUrl ? textOutput.includes(configuredFeedbackUrl) : false;
if (configuredFeedbackUrl && !feedbackUrlEmbedded) issues.push('The configured feedback URL is not embedded in the itch build. Rebuild with VITE_BETA_FEEDBACK_URL set.');

const entries = outputFiles
  .map((file) => ({
    path: relative(root, file).replaceAll('\\', '/'),
    bytes: statSync(file).size,
    sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
  }))
  .sort((left, right) => left.path.localeCompare(right.path));
const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
const fingerprint = createHash('sha256').update(JSON.stringify(entries)).digest('hex');
const manifest = {
  schemaVersion: 1,
  buildId: RELEASE_INFO.buildId,
  releaseVersion: RELEASE_INFO.version,
  generatedAt: new Date().toISOString(),
  hosting: 'itch-html5-iframe-relative',
  serviceWorkerEnabled: false,
  totalBytes,
  fileCount: entries.length,
  fingerprint,
  configuredFeedbackUrl,
  feedbackUrlEmbedded,
  assetClasses,
  files: entries,
};
writeFileSync(join(root, 'itch-build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const report = { ...manifest, passed: issues.length === 0, issues };
mkdirSync(reportRoot, { recursive: true });
writeFileSync(join(reportRoot, 'itch-build-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Itch build audit: ${issues.length ? 'FAIL' : 'PASS'} · ${(totalBytes / 1024 / 1024).toFixed(2)} MB · ${entries.length} files`);
for (const issue of issues) console.log(`- ${issue}`);
if (issues.length) process.exitCode = 1;
