import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const reportPath = path.join(root, 'reports', 'commercial-release', 'consumer-build-audit.json');
const blockers: string[] = [];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const candidate = path.join(directory, name);
    return statSync(candidate).isDirectory() ? walk(candidate) : [candidate];
  });
}

if (!existsSync(path.join(dist, 'index.html'))) blockers.push('Production build is missing. Run the normal production build before this audit.');
const files = existsSync(dist) ? walk(dist) : [];
const relativeFiles = files.map((file) => path.relative(dist, file).replaceAll('\\', '/'));
const internalChunkPatterns = [/ValidationRunsScreen/i, /ControlConceptPlaytestScreen/i, /MissionAuthoringScreen/i, /DiagnosticsPanel/i, /EncounterHarness/i];
for (const file of relativeFiles) {
  if (internalChunkPatterns.some((pattern) => pattern.test(file))) blockers.push(`Internal-only chunk shipped: ${file}`);
}

const javascript = files.filter((file) => /\.js$/i.test(file)).map((file) => readFileSync(file, 'utf8')).join('\n');
for (const marker of ['__STRIKE_VECTOR_VALIDATION__', '__STRIKE_VECTOR_BALANCE__', 'LOCAL PLAYTEST DIAGNOSTICS', 'EARLY CONTROL-CONCEPT TEST']) {
  if (javascript.includes(marker)) blockers.push(`Internal-only runtime marker shipped: ${marker}`);
}

const requiredNotices = [
  'legal/EULA.txt', 'legal/PRIVACY.txt', 'legal/SUPPORT.txt',
  'legal/AI_CONTENT_DISCLOSURE.txt', 'legal/THIRD_PARTY_NOTICES.txt',
  'legal/RUST_THIRD_PARTY_NOTICES.txt',
];
for (const notice of requiredNotices) if (!relativeFiles.includes(notice)) blockers.push(`Consumer disclosure missing from build: ${notice}`);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: blockers.length ? 'BLOCKED' : 'PASS',
  fileCount: files.length,
  internalChunks: relativeFiles.filter((file) => internalChunkPatterns.some((pattern) => pattern.test(file))),
  disclosures: requiredNotices.filter((notice) => relativeFiles.includes(notice)),
  blockers,
};
mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Consumer build audit: ${report.status}`);
console.log(`Files: ${report.fileCount}; disclosures: ${report.disclosures.length}/${requiredNotices.length}; internal chunks: ${report.internalChunks.length}`);
blockers.forEach((blocker) => console.error(`BLOCKER: ${blocker}`));
if (blockers.length) process.exitCode = 1;
