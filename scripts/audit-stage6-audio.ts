import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { AUDIO_CUE_DEFINITIONS } from '../src/audio/SoundEngine';
import { MIXER_BASE_GAINS, PRIORITY_DUCKING } from '../src/audio/AudioMix';
import { RELEASE_INFO } from '../src/game/Release';

const root = process.cwd();
const issues: string[] = [];
const assets = Object.values(AUDIO_CUE_DEFINITIONS).filter((cue) => cue.samplePath);
let totalBytes = 0;
const files: Array<{ id: string; path: string; bytes: number; sampleRate: number; channels: number; bitsPerSample: number; peak: number; rms: number }> = [];

for (const cue of assets) {
  const relative = cue.samplePath!.replace(/^\//, 'public/');
  const absolute = join(root, relative);
  try {
    const [buffer, info] = await Promise.all([readFile(absolute), stat(absolute)]);
    totalBytes += info.size;
    if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a RIFF/WAVE file');
    const channels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);
    const dataOffset = buffer.indexOf(Buffer.from('data'));
    if (dataOffset < 0) throw new Error('missing data chunk');
    const dataSize = buffer.readUInt32LE(dataOffset + 4);
    const start = dataOffset + 8;
    let peak = 0;
    let squareTotal = 0;
    let samples = 0;
    for (let offset = start; offset + 1 < Math.min(buffer.length, start + dataSize); offset += 2) {
      const value = buffer.readInt16LE(offset) / 32768;
      peak = Math.max(peak, Math.abs(value));
      squareTotal += value * value;
      samples++;
    }
    const rms = samples ? Math.sqrt(squareTotal / samples) : 0;
    files.push({ id: cue.id, path: relative, bytes: info.size, sampleRate, channels, bitsPerSample, peak, rms });
    if (channels !== 1 || sampleRate !== 22050 || bitsPerSample !== 16) issues.push(`${cue.id} must be mono 22.05 kHz 16-bit PCM.`);
    if (info.size <= 44 || rms < 0.005) issues.push(`${cue.id} is empty or effectively silent.`);
    if (peak >= 0.99999) issues.push(`${cue.id} reaches digital full scale.`);
  } catch (error) {
    issues.push(`${cue.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (assets.length !== 48) issues.push(`Expected all 48 production-manifest SFX to use authored cues; found ${assets.length}.`);
if (new Set(assets.map((cue) => cue.samplePath)).size !== assets.length) issues.push('Audio cue paths must be unique.');
if (totalBytes > 5_000_000) issues.push(`Authored audio pack is ${totalBytes} bytes; budget is 5000000.`);
if (MIXER_BASE_GAINS.WARNINGS <= MIXER_BASE_GAINS.ENGINE || MIXER_BASE_GAINS.RADIO <= MIXER_BASE_GAINS.AMBIENCE) issues.push('Critical buses do not remain above background buses.');
if (PRIORITY_DUCKING.WARNING.engine >= MIXER_BASE_GAINS.ENGINE || PRIORITY_DUCKING.RADIO.ambience >= MIXER_BASE_GAINS.AMBIENCE) issues.push('Priority ducking does not create sufficient warning/radio space.');

const report = { version: 1, generatedAt: new Date().toISOString(), buildId: RELEASE_INFO.buildId, passed: issues.length === 0, cueCount: assets.length, totalBytes, files, issues };
await mkdir(join(root, 'reports/stage6'), { recursive: true });
await writeFile(join(root, 'reports/stage6/audio-asset-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Stage 6 audio asset audit: ${report.passed ? 'PASS' : 'FAIL'} (${assets.length} cues, ${Math.round(totalBytes / 1024)} KiB)`);
for (const issue of issues) console.log(`- ${issue}`);
if (!report.passed) process.exitCode = 1;
