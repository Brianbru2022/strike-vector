import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

const root = resolve(import.meta.dirname, '..');
const releaseRoot = join(root, 'src-tauri', 'target', 'release');
const outputRoot = join(root, 'release-artifacts', `windows-${RELEASE_INFO.version}`);
const candidates = [
  join(releaseRoot, 'iron-kestrel-87.exe'),
  join(releaseRoot, 'bundle', 'msi', "Iron Kestrel '87_1.2.0-1_x64_en-US.msi"),
];

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(join(outputRoot, 'portable-qa'), { recursive: true });
mkdirSync(join(outputRoot, 'installers'), { recursive: true });

const artefacts = candidates.filter(existsSync).map((source, index) => {
  const destination = join(outputRoot, index === 0 ? 'portable-qa' : 'installers', basename(source));
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
  const bytes = readFileSync(destination);
  return {
    file: destination.slice(outputRoot.length + 1).replaceAll('\\', '/'),
    bytes: statSync(destination).size,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
});

if (!artefacts.length) throw new Error('No Windows build artefacts were found. Run pnpm desktop:build first.');

const manifest = {
  format: 'IRON_KESTREL_WINDOWS_RELEASE_V1',
  version: RELEASE_INFO.version,
  buildId: RELEASE_INFO.buildId,
  target: 'windows-x86_64',
  saveCloudRoot: 'WinAppDataRoaming',
  saveCloudPath: 'com.ironkestrel.iron-kestrel-87/save-v1.json',
  signed: false,
  signedAt: null,
  certificateReference: null,
  timestampServer: null,
  signingNote: 'Set IRON_KESTREL_SIGNING_CERT_SHA1 and run scripts/sign-windows-artifacts.ps1 before distribution.',
  artefacts,
};
writeFileSync(join(outputRoot, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Collected ${artefacts.length} Windows artefact(s) in ${outputRoot}`);
