import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

type DeviceName = 'HEADPHONES' | 'SPEAKERS' | 'LAPTOP_OR_MOBILE';
interface ListeningDeviceEvidence {
  device: DeviceName;
  status: 'PENDING' | 'PASS' | 'FAIL';
  warningsClear: boolean | null;
  radioClear: boolean | null;
  weaponsDistinct: boolean | null;
  engineBalanced: boolean | null;
  ambienceBalanced: boolean | null;
  noDistortion: boolean | null;
  notes: string;
}
interface AudioListeningEvidenceV1 {
  version: 1;
  buildId: string;
  completedAt: string | null;
  devices: ListeningDeviceEvidence[];
}

const root = process.cwd();
const issues: string[] = [];
let evidence: AudioListeningEvidenceV1 | null = null;
let visualManifest: { buildId?: string; captures?: Array<{ viewport: string; missionNumber: number }> } | null = null;
let audioAudit: { buildId?: string; passed?: boolean } | null = null;

try { evidence = JSON.parse(await readFile(join(root, 'reports/stage6/audio-listening-evidence.json'), 'utf8')) as AudioListeningEvidenceV1; }
catch { issues.push('Audio listening evidence is missing or invalid.'); }
try { visualManifest = JSON.parse(await readFile(join(root, 'reports/visual-integration/manifest.json'), 'utf8')); }
catch { issues.push('Fresh visual capture manifest is missing or invalid.'); }
try { audioAudit = JSON.parse(await readFile(join(root, 'reports/stage6/audio-asset-audit.json'), 'utf8')); }
catch { issues.push('Stage 6 audio asset audit is missing or invalid.'); }

if (evidence) {
  if (evidence.version !== 1) issues.push('Unsupported audio evidence version.');
  if (evidence.buildId !== RELEASE_INFO.buildId) issues.push(`Audio evidence belongs to ${evidence.buildId}, not ${RELEASE_INFO.buildId}.`);
  const expected: DeviceName[] = ['HEADPHONES', 'SPEAKERS', 'LAPTOP_OR_MOBILE'];
  for (const device of expected) {
    const matches = evidence.devices.filter((entry) => entry.device === device);
    if (matches.length !== 1) { issues.push(`${device} evidence coverage is ${matches.length}/1.`); continue; }
    const entry = matches[0];
    if (entry.status !== 'PASS' || !entry.warningsClear || !entry.radioClear || !entry.weaponsDistinct || !entry.engineBalanced || !entry.ambienceBalanced || !entry.noDistortion) issues.push(`${device} listening sign-off is incomplete or failed.`);
  }
  if (!evidence.completedAt || !Number.isFinite(Date.parse(evidence.completedAt))) issues.push('Audio evidence has no valid completion time.');
}

if (audioAudit && (audioAudit.buildId !== RELEASE_INFO.buildId || !audioAudit.passed)) issues.push('Audio asset audit does not pass for the current build.');

if (visualManifest) {
  if (visualManifest.buildId !== RELEASE_INFO.buildId) issues.push(`Visual evidence belongs to ${visualManifest.buildId ?? 'an unknown build'}, not ${RELEASE_INFO.buildId}.`);
  for (const viewport of ['desktop', 'ultrawide', 'mobile-landscape']) {
    const missions = new Set((visualManifest.captures ?? []).filter((item) => item.viewport === viewport).map((item) => item.missionNumber));
    if (missions.size !== 16) issues.push(`${viewport} fresh visual coverage is ${missions.size}/16.`);
  }
}

const result = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, passed: issues.length === 0, issues };
await mkdir(join(root, 'reports/stage6'), { recursive: true });
await writeFile(join(root, 'reports/stage6/certification.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(`Stage 6 release gate: ${result.passed ? 'PASS' : 'PENDING'} (${issues.length} issue${issues.length === 1 ? '' : 's'})`);
for (const issue of issues) console.log(`- ${issue}`);
if (!result.passed) process.exitCode = 1;
