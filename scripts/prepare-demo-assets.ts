import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { RELEASE_INFO } from '../src/game/Release';

const root = resolve('.');
const sourceRoot = resolve(root, 'public');
const outputRoot = resolve(root, '.demo-public');
if (!outputRoot.startsWith(`${root}${sep}`) || outputRoot === root) throw new Error('Refusing to prepare demo assets outside the project workspace.');
if (existsSync(outputRoot)) rmSync(outputRoot, { recursive: true, force: true });

const assets = [
  'assets/backgrounds/mission-1-dawn-showcase-v2.webp',
  'assets/backgrounds/mission-6-storm-showcase-v2.webp',
  'assets/backgrounds/north-atlantic-dawn-painted.webp',
  'assets/backgrounds/storm-fleet-painted-v1.webp',
  'assets/layers/coast-approach-panorama.webp',
  'assets/layers/coast-basalt-panorama.webp',
  'assets/layers/coast-tundra-panorama.webp',
  'assets/layers/coast-beach-panorama.webp',
  'assets/layers/ocean-foreground-panorama.webp',
  'assets/sprites/sea-harrier-frs1-hero-v3.png',
  'assets/sprites/sea-harrier-turn-v1.png',
  'assets/sprites/invincible-carrier-hero-v3.png',
  'assets/sprites/mig21bis-hero-v3.png',
  'assets/sprites/mig23ml-hero-v3.png',
  'assets/sprites/mig29a-hero-v3.png',
  'assets/sprites/missile-patrol-boat-hero-v3.png',
  'assets/sprites/missile-corvette-hero-v3.png',
  'assets/sprites/explosion-fireball-v2.png',
  'assets/sprites/explosion-smoke-v2.png',
  'assets/sprites/explosion-stages-stage6-v1.png',
  'assets/sprites/combat-wrecks-v1.png',
  'assets/sprites/harrier-ejection-v1.png',
  'assets/audio/elevenlabs/aden-cannon-v2.wav',
  'assets/audio/elevenlabs/sidewinder-launch-v2.wav',
  'assets/audio/elevenlabs/sidewinder-flyby-v1.wav',
  'assets/audio/elevenlabs/rocket-pod-salvo-v1.wav',
  'assets/audio/elevenlabs/bomb-release-v2.wav',
  'assets/audio/elevenlabs/flare-eject-v2.wav',
  'assets/audio/elevenlabs/aircraft-gun-hit-v1.wav',
  'assets/audio/elevenlabs/ground-armour-hit-v1.wav',
  'assets/audio/elevenlabs/ground-soft-hit-v1.wav',
  'assets/audio/elevenlabs/water-impact-v1.wav',
  'assets/audio/elevenlabs/explosion-small-v1.wav',
  'assets/audio/elevenlabs/explosion-medium-v1.wav',
  'assets/audio/elevenlabs/explosion-large-v1.wav',
  'assets/audio/elevenlabs/fuel-cookoff-v1.wav',
  'assets/audio/elevenlabs/aircraft-breakup-v1.wav',
  'assets/audio/elevenlabs/aircraft-ground-crash-v1.wav',
  'assets/audio/elevenlabs/aircraft-sea-crash-v1.wav',
  'assets/audio/elevenlabs/ejection-seat-v1.wav',
  'assets/audio/elevenlabs/naval-gun-v2.wav',
  'assets/audio/elevenlabs/antiship-missile-launch-v1.wav',
  'assets/audio/elevenlabs/carrier-touchdown-v2.wav',
  'assets/audio/elevenlabs/carrier-deck-ambience-v1.wav',
  'assets/audio/elevenlabs/farp-ambience-v1.wav',
  'assets/audio/elevenlabs/storm-rain-loop-v1.wav',
  'assets/audio/elevenlabs/thunder-distant-v1.wav',
  'assets/audio/elevenlabs/radar-search-v1.wav',
  'assets/audio/elevenlabs/coastal-surf-loop-v1.wav',
  'assets/audio/elevenlabs/radar-track-loop-v1.wav',
  'assets/audio/elevenlabs/missile-warning-loop-v1.wav',
  'assets/audio/elevenlabs/target-lock-v1.wav',
  'assets/audio/elevenlabs/low-fuel-warning-v1.wav',
  'assets/audio/heavy-impact-v1.wav',
  'assets/audio/north-atlantic-wind-v1.wav',
  'assets/audio/elevenlabs/pegasus-idle-loop-v1.wav',
  'assets/audio/elevenlabs/pegasus-power-loop-v1.wav',
  'assets/audio/elevenlabs/airframe-wind-loop-v1.wav',
  'assets/audio/elevenlabs/vtol-downwash-loop-v2.wav',
  'assets/audio/elevenlabs/nozzle-transition-v1.wav',
  'assets/audio/elevenlabs/landing-gear-cycle-v1.wav',
  'assets/audio/elevenlabs/compressor-stall-v1.wav',
  'assets/audio/elevenlabs/engine-damaged-loop-v1.wav',
  'assets/audio/radio-chirp-v1.wav',
  'assets/ui/title-composition-hero-v1.webp',
  'assets/ui/briefing-iron-dawn-v2.jpg',
  'legal/PRIVACY.txt',
  'legal/SUPPORT.txt',
  'legal/EULA.txt',
  'legal/AI_CONTENT_DISCLOSURE.txt',
  'legal/THIRD_PARTY_NOTICES.txt',
  'legal/RUST_THIRD_PARTY_NOTICES.txt',
];

for (const relative of assets) {
  const source = resolve(sourceRoot, relative);
  if (!existsSync(source)) throw new Error(`Missing required demo asset: ${relative}`);
  const destination = resolve(outputRoot, relative);
  mkdirSync(dirname(destination), { recursive: true });
  if (relative.endsWith('.wav')) {
    // The focused browser demo keeps recognisable production cues while using
    // compact derivatives; the paid web/desktop builds retain 22.05 kHz files.
    const compactRate = /ambience|storm-rain|coastal-surf|north-atlantic-wind/.test(relative) ? '3000' : '4000';
    const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-ac', '1', '-ar', compactRate, '-c:a', 'pcm_s16le', destination], { stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error(`Could not prepare compact demo audio: ${relative}`);
  } else {
    copyFileSync(source, destination);
  }
}
copyFileSync(resolve(sourceRoot, 'demo-commercial-edition.html'), resolve(outputRoot, 'commercial-edition.html'));
const bytes = assets.reduce((sum, relative) => sum + statSync(resolve(outputRoot, relative)).size, 0) + statSync(resolve(outputRoot, 'commercial-edition.html')).size;
const sha256ByAsset = Object.fromEntries(assets.map((relative) => [relative, createHash('sha256').update(readFileSync(resolve(outputRoot, relative))).digest('hex')]));
const fingerprint = createHash('sha256').update(JSON.stringify({ assets, sha256ByAsset })).digest('hex');
writeFileSync(resolve(outputRoot, 'demo-asset-manifest.json'), JSON.stringify({ version: 1, buildId: RELEASE_INFO.buildId, budgetBytes: 15 * 1024 * 1024, assets, bytes, sha256ByAsset, fingerprint }, null, 2));
console.log(`Prepared ${assets.length} focused demo assets (${(bytes / 1024 / 1024).toFixed(2)} MB).`);
