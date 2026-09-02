import { createHash } from 'node:crypto';
import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';
import { VisualCaptureManifestV1 } from '../src/types/game';

const root = process.cwd();
const directory = join(root, 'reports', 'visual-integration');
const issues: string[] = [];
let manifest: VisualCaptureManifestV1 | null = null;
try { manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')) as VisualCaptureManifestV1; }
catch { issues.push('Visual capture manifest is missing or invalid.'); }

if (manifest) {
  if (manifest.version !== 1) issues.push('Visual manifest version is not supported.');
  if (manifest.buildId !== RELEASE_INFO.buildId || manifest.releaseVersion !== RELEASE_INFO.version) issues.push(`Visual evidence belongs to ${manifest.buildId || 'an unknown build'}, not ${RELEASE_INFO.buildId}.`);
  if (!manifest.servedTitle.includes("Iron Kestrel '87")) issues.push(`Visual evidence was captured from the wrong application: ${manifest.servedTitle}.`);
  const expectedViewports = new Map([['desktop', [1920, 1080]], ['ultrawide', [3440, 1440]], ['mobile-landscape', [844, 390]]]);
  for (const [name, dimensions] of expectedViewports) {
    const captures = manifest.captures.filter((capture) => capture.viewport === name);
    if (captures.length !== 16) issues.push(`${name} coverage is ${captures.length}/16.`);
    if (captures.some((capture) => capture.width !== dimensions[0] || capture.height !== dimensions[1])) issues.push(`${name} contains incorrect dimensions.`);
  }
  const routeCaptures = manifest.captures.filter((capture) => capture.viewport === 'route');
  if (routeCaptures.length !== 48) issues.push(`Route coverage is ${routeCaptures.length}/48.`);
  const objectiveCaptures = manifest.captures.filter((capture) => capture.viewport === 'objective');
  if (objectiveCaptures.length !== 16) issues.push(`Objective coverage is ${objectiveCaptures.length}/16.`);
  const names = new Set<string>();
  for (const capture of manifest.captures) {
    if (names.has(capture.file)) issues.push(`Duplicate capture entry: ${capture.file}.`);
    names.add(capture.file);
    try {
      const bytes = await readFile(join(directory, capture.file));
      const checksum = createHash('sha256').update(bytes).digest('hex');
      if (checksum !== capture.sha256) issues.push(`Checksum mismatch: ${capture.file}.`);
      const dimensions = readImageDimensions(bytes);
      if (!dimensions) issues.push(`Unsupported or malformed capture image: ${capture.file}.`);
      else if (dimensions.width !== capture.width || dimensions.height !== capture.height) {
        issues.push(`Capture dimensions mismatch for ${capture.file}: manifest ${capture.width}x${capture.height}, file ${dimensions.width}x${dimensions.height}.`);
      }
    } catch { issues.push(`Capture is missing: ${capture.file}.`); }
  }
  const sourceFiles: string[] = [];
  await collect(join(root, 'src'), sourceFiles);
  const newestSource = Math.max(...await Promise.all(sourceFiles.map(async (file) => (await stat(file)).mtimeMs)));
  if (!Number.isFinite(Date.parse(manifest.generatedAt)) || Date.parse(manifest.generatedAt) < newestSource) issues.push('Visual evidence predates the current source tree.');
}

const report = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, manifestBuildId: manifest?.buildId ?? null, captures: manifest?.captures.length ?? 0, issues, passed: issues.length === 0 };
const reportDirectory = join(root, 'reports', 'stage-1');
await mkdir(reportDirectory, { recursive: true });
await writeFile(join(reportDirectory, 'visual-manifest-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Visual manifest audit: ${report.passed ? 'PASS' : 'FAIL'} (${report.captures} captures)`);
if (!report.passed) process.exitCode = 1;

async function collect(directoryPath: string, output: string[]): Promise<void> {
  for (const entry of await readdir(directoryPath, { withFileTypes: true })) {
    const path = join(directoryPath, entry.name);
    if (entry.isDirectory()) await collect(path, output);
    else if (/\.(?:ts|tsx|css)$/.test(entry.name)) output.push(path);
  }
}

function readImageDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0x01) continue;
    if (marker === 0xd9 || marker === 0xda || offset + 1 >= bytes.length) break;
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += segmentLength;
  }
  return null;
}
