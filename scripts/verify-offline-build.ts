import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const serviceWorker = await readFile(join(root, 'dist', 'sw.js'), 'utf8');
const cachedUrls = [...serviceWorker.matchAll(/\{url:"([^"]+)"/g)].map((match) => match[1]);
const duplicates = [...new Set(cachedUrls.filter((url, index) => cachedUrls.indexOf(url) !== index))];
const eligibleExtensions = new Set(['.js', '.css', '.html', '.json', '.jpg', '.png', '.webp', '.wav', '.svg', '.woff2']);
const publicFiles = (await walk(join(root, 'public')))
  .filter((path) => eligibleExtensions.has(extname(path).toLowerCase()))
  .map((path) => relative(join(root, 'public'), path).replaceAll('\\', '/'));
const missing = publicFiles.filter((path) => !cachedUrls.includes(path));

console.log(`Offline build: ${cachedUrls.length} precache entries; ${publicFiles.length - missing.length}/${publicFiles.length} eligible public assets cached.`);
if (duplicates.length) console.error(`Duplicate precache URLs: ${duplicates.join(', ')}`);
if (missing.length) console.error(`Public assets missing from precache: ${missing.join(', ')}`);
if (duplicates.length || missing.length) process.exitCode = 1;
else console.log('Offline build verification: PASS');

async function walk(directory: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(path));
    else paths.push(path);
  }
  return paths;
}
