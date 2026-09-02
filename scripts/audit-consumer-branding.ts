import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const targets = [join(root, 'src', 'components'), join(root, 'src', 'game', 'SpriteAssetManager.ts')];
const files: string[] = [];
for (const target of targets) await collect(target, files);
const forbidden = [/Strike Vector/i, /STRIKE_VECTOR/, /\bSV-[0-9A-Z]/];
const violations: Array<{ file: string; line: number; text: string }> = [];
for (const file of files.filter((name) => !name.endsWith('.test.ts') && !name.endsWith('.test.tsx'))) {
  const source = await readFile(file, 'utf8');
  source.split(/\r?\n/).forEach((line, index) => {
    if (forbidden.some((pattern) => pattern.test(line))) violations.push({ file: relative(root, file).replaceAll('\\', '/'), line: index + 1, text: line.trim().slice(0, 180) });
  });
}
const report = { version: 1, generatedAt: new Date().toISOString(), scannedFiles: files.length, violations, passed: violations.length === 0 };
const directory = join(root, 'reports', 'stage-1');
await mkdir(directory, { recursive: true });
await writeFile(join(directory, 'consumer-branding-audit.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Consumer branding audit: ${report.passed ? 'PASS' : 'FAIL'} (${violations.length} violation(s))`);
if (!report.passed) process.exitCode = 1;

async function collect(target: string, output: string[]): Promise<void> {
  if (/\.[cm]?[jt]sx?$/.test(target)) { output.push(target); return; }
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const path = join(target, entry.name);
    if (entry.isDirectory()) await collect(path, output);
    else if (/\.[jt]sx?$/.test(entry.name)) output.push(path);
  }
}
