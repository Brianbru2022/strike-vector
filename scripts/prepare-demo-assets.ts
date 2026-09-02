import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
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
  'assets/audio/aden-cannon-v1.wav',
  'assets/audio/sidewinder-motor-v1.wav',
  'assets/audio/heavy-impact-v1.wav',
  'assets/audio/north-atlantic-wind-v1.wav',
  'assets/audio/pegasus-engine-loop-v2.wav',
  'assets/audio/vtol-downwash-loop-v1.wav',
  'assets/audio/rocket-motor-v1.wav',
  'assets/audio/bomb-release-v1.wav',
  'assets/audio/flare-eject-v1.wav',
  'assets/audio/naval-gun-v1.wav',
  'assets/audio/carrier-touchdown-v1.wav',
  'assets/audio/threat-warning-v1.wav',
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
  copyFileSync(source, destination);
}
copyFileSync(resolve(sourceRoot, 'demo-commercial-edition.html'), resolve(outputRoot, 'commercial-edition.html'));
const bytes = assets.reduce((sum, relative) => sum + statSync(resolve(sourceRoot, relative)).size, 0) + statSync(resolve(sourceRoot, 'demo-commercial-edition.html')).size;
const sha256ByAsset = Object.fromEntries(assets.map((relative) => [relative, createHash('sha256').update(readFileSync(resolve(sourceRoot, relative))).digest('hex')]));
const fingerprint = createHash('sha256').update(JSON.stringify({ assets, sha256ByAsset })).digest('hex');
writeFileSync(resolve(outputRoot, 'demo-asset-manifest.json'), JSON.stringify({ version: 1, buildId: RELEASE_INFO.buildId, budgetBytes: 15 * 1024 * 1024, assets, bytes, sha256ByAsset, fingerprint }, null, 2));
console.log(`Prepared ${assets.length} focused demo assets (${(bytes / 1024 / 1024).toFixed(2)} MB).`);
