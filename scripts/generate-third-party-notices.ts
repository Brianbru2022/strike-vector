import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface PackageNotice {
  name: string;
  version: string;
  licence: string;
  homepage: string | null;
  licenceTextId: string | null;
}

const root = process.cwd();
const store = path.join(root, 'node_modules', '.pnpm');
const output = path.join(root, 'public', 'legal', 'THIRD_PARTY_NOTICES.txt');
const reportOutput = path.join(root, 'reports', 'commercial-release', 'dependency-licences.json');
const blockedLicence = /(^|[^L])A?GPL|SSPL|BUSL|UNKNOWN|UNLICENSED/i;

function packageDirectories(nodeModules: string): string[] {
  if (!existsSync(nodeModules)) return [];
  return readdirSync(nodeModules, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) return [];
    const candidate = path.join(nodeModules, entry.name);
    if (!entry.name.startsWith('@')) return existsSync(path.join(candidate, 'package.json')) ? [candidate] : [];
    return readdirSync(candidate, { withFileTypes: true })
      .filter((child) => child.isDirectory() || child.isSymbolicLink())
      .map((child) => path.join(candidate, child.name))
      .filter((child) => existsSync(path.join(child, 'package.json')));
  });
}

function licenceValue(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && 'type' in value && typeof value.type === 'string') return value.type;
  return 'UNKNOWN';
}

function homepageValue(pkg: Record<string, unknown>): string | null {
  if (typeof pkg.homepage === 'string') return pkg.homepage;
  const repository = pkg.repository;
  if (typeof repository === 'string') return repository;
  if (repository && typeof repository === 'object' && 'url' in repository && typeof repository.url === 'string') return repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
  return null;
}

function findLicenceText(directory: string): string | null {
  const file = readdirSync(directory).find((name) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(name) && statSync(path.join(directory, name)).isFile());
  if (!file) return null;
  const text = readFileSync(path.join(directory, file), 'utf8').trim();
  return text || null;
}

const packagePaths = readdirSync(store, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => packageDirectories(path.join(store, entry.name, 'node_modules')));

const uniquePackages = new Map<string, { directory: string; pkg: Record<string, unknown> }>();
for (const directory of packagePaths) {
  const pkg = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')) as Record<string, unknown>;
  if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') continue;
  uniquePackages.set(`${pkg.name}@${pkg.version}`, { directory, pkg });
}

const textByHash = new Map<string, { id: string; text: string }>();
const notices: PackageNotice[] = [...uniquePackages.values()].map(({ directory, pkg }) => {
  const text = findLicenceText(directory);
  let licenceTextId: string | null = null;
  if (text) {
    const hash = createHash('sha256').update(text).digest('hex');
    if (!textByHash.has(hash)) textByHash.set(hash, { id: `L${textByHash.size + 1}`, text });
    licenceTextId = textByHash.get(hash)!.id;
  }
  return {
    name: String(pkg.name), version: String(pkg.version), licence: licenceValue(pkg.license),
    homepage: homepageValue(pkg), licenceTextId,
  };
}).sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

const unresolved = notices.filter((notice) => blockedLicence.test(notice.licence));
const missingLicenceFiles = notices.filter((notice) => !notice.licenceTextId);
const index = notices.map((notice) => `${notice.name} ${notice.version} | ${notice.licence} | ${notice.licenceTextId ?? 'NO LICENCE FILE'}${notice.homepage ? ` | ${notice.homepage}` : ''}`).join('\n');
const texts = [...textByHash.values()].map((entry) => `\n================================================================================\n${entry.id}\n================================================================================\n${entry.text}`).join('\n');
const preamble = `IRON KESTREL '87 - THIRD-PARTY SOFTWARE NOTICES\nGenerated from the installed pnpm dependency tree.\n\nThe following packages are used to build, serve or run the game. Inclusion does not imply endorsement. Licence texts are deduplicated and referenced by identifier.\n\nPACKAGE INDEX\n=============`;

mkdirSync(path.dirname(output), { recursive: true });
mkdirSync(path.dirname(reportOutput), { recursive: true });
writeFileSync(output, `${preamble}\n${index}\n\nLICENCE TEXTS\n=============${texts}\n`);
writeFileSync(reportOutput, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), packageCount: notices.length, licenceTextCount: textByHash.size, unresolved, missingLicenceFiles, packages: notices }, null, 2)}\n`);

console.log(`Third-party notices: ${unresolved.length ? 'BLOCKED' : 'PASS'}`);
console.log(`Packages: ${notices.length}; unique licence texts: ${textByHash.size}; blockers: ${unresolved.length}; declared licences without bundled text: ${missingLicenceFiles.length}`);
if (unresolved.length) {
  unresolved.forEach((notice) => console.error(`${notice.name}@${notice.version}: ${notice.licence}, text ${notice.licenceTextId ?? 'missing'}`));
  process.exitCode = 1;
}
if (missingLicenceFiles.length) {
  console.warn('Review note: the following packages declare a permissive licence but do not bundle a separate licence file:');
  missingLicenceFiles.forEach((notice) => console.warn(`${notice.name}@${notice.version}: ${notice.licence}${notice.homepage ? ` (${notice.homepage})` : ''}`));
}
