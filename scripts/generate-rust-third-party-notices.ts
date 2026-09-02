import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface CargoPackage {
  name: string;
  version: string;
  license: string | null;
  repository: string | null;
  manifest_path: string;
  source: string | null;
}

const root = process.cwd();
const metadata = JSON.parse(execFileSync('cargo', ['metadata', '--format-version', '1', '--locked', '--manifest-path', 'src-tauri/Cargo.toml'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })) as { packages: CargoPackage[] };
const packages = metadata.packages.filter((pkg) => pkg.source?.startsWith('registry+')).sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
const textByHash = new Map<string, { id: string; text: string }>();
const missing: Array<{ name: string; version: string; license: string | null; repository: string | null }> = [];
const records = packages.map((pkg) => {
  const directory = path.dirname(pkg.manifest_path);
  const file = readdirSync(directory).find((name) => /^(licen[cs]e|copying|notice)([-_.].*)?$/i.test(name) && statSync(path.join(directory, name)).isFile());
  let textId: string | null = null;
  if (file) {
    const text = readFileSync(path.join(directory, file), 'utf8').trim();
    const hash = createHash('sha256').update(text).digest('hex');
    if (!textByHash.has(hash)) textByHash.set(hash, { id: `R${textByHash.size + 1}`, text });
    textId = textByHash.get(hash)!.id;
  } else {
    missing.push({ name: pkg.name, version: pkg.version, license: pkg.license, repository: pkg.repository });
  }
  return { name: pkg.name, version: pkg.version, license: pkg.license ?? 'UNKNOWN', repository: pkg.repository, licenceTextId: textId };
});
const unresolved = records.filter((record) => !record.license || /UNKNOWN|UNLICENSED/i.test(record.license));
const index = records.map((record) => `${record.name} ${record.version} | ${record.license} | ${record.licenceTextId ?? 'NO LICENCE FILE'}${record.repository ? ` | ${record.repository}` : ''}`).join('\n');
const texts = [...textByHash.values()].map((entry) => `\n================================================================================\n${entry.id}\n================================================================================\n${entry.text}`).join('\n');
const output = path.join(root, 'public/legal/RUST_THIRD_PARTY_NOTICES.txt');
const report = path.join(root, 'reports/commercial-release/rust-dependency-licences.json');
mkdirSync(path.dirname(output), { recursive: true });
mkdirSync(path.dirname(report), { recursive: true });
writeFileSync(output, `IRON KESTREL '87 - RUST AND TAURI THIRD-PARTY NOTICES\nGenerated from the locked Cargo dependency graph used by the Windows edition.\n\nPACKAGE INDEX\n=============\n${index}\n\nLICENCE TEXTS\n=============${texts}\n`);
writeFileSync(report, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), packageCount: records.length, licenceTextCount: textByHash.size, unresolved, missingLicenceFiles: missing, packages: records }, null, 2)}\n`);
console.log(`Rust third-party notices: ${unresolved.length ? 'BLOCKED' : 'PASS'}; ${records.length} packages; ${textByHash.size} texts; ${missing.length} missing files.`);
if (unresolved.length) process.exitCode = 1;
