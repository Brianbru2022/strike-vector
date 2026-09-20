import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Entry { id?: string; durationSeconds?: number; loop?: boolean; use?: string; prompt?: string }
interface Manifest { schemaVersion?: number; sourceStandard?: string; globalRestrictions?: string; music?: Entry[]; soundEffects?: Entry[] }

const manifest = JSON.parse(readFileSync(resolve('config/audio-production-manifest.json'), 'utf8')) as Manifest;
const issues: string[] = [];
if (manifest.schemaVersion !== 1) issues.push('Manifest schemaVersion must be 1.');
if (!manifest.sourceStandard?.includes('48 kHz') || !manifest.globalRestrictions?.includes('Original material only')) issues.push('Source and originality standards are incomplete.');
const entries = [...(manifest.music ?? []), ...(manifest.soundEffects ?? [])];
if ((manifest.music?.length ?? 0) < 10) issues.push('At least ten music briefs are required.');
if ((manifest.soundEffects?.length ?? 0) < 40) issues.push('At least forty sound-effect briefs are required.');
if (new Set(entries.map((entry) => entry.id)).size !== entries.length) issues.push('Audio production IDs must be unique.');
for (const entry of entries) {
  if (!entry.id || !/^(music|sfx)_[a-z0-9_]+$/.test(entry.id)) issues.push(`Invalid audio ID: ${entry.id ?? '(missing)'}.`);
  if (!entry.use?.trim()) issues.push(`${entry.id ?? '(missing)'} has no intended use.`);
  if (!Number.isFinite(entry.durationSeconds) || (entry.durationSeconds ?? 0) <= 0) issues.push(`${entry.id ?? '(missing)'} has no valid duration.`);
  if (typeof entry.loop !== 'boolean') issues.push(`${entry.id ?? '(missing)'} does not declare loop behaviour.`);
  if ((entry.prompt?.trim().length ?? 0) < 80) issues.push(`${entry.id ?? '(missing)'} needs a complete generation prompt.`);
  if (/in the style of|sound like|hans zimmer|vangelis|top gun|john williams/i.test(entry.prompt ?? '')) issues.push(`${entry.id ?? '(missing)'} contains an artist or identifiable-work imitation request.`);
}
console.log(`Audio production manifest: ${issues.length ? 'FAIL' : 'PASS'} · ${manifest.music?.length ?? 0} music · ${manifest.soundEffects?.length ?? 0} SFX`);
for (const issue of issues) console.error(`- ${issue}`);
if (issues.length) process.exitCode = 1;
