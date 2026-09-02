import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { RELEASE_INFO } from '../src/game/Release';

const baseUrl = process.env.STOREFRONT_CAPTURE_URL || 'http://127.0.0.1:4178';
const root = process.cwd();
const output = path.join(root, 'marketing', 'store', 'stage9');
const screenshotDirectory = path.join(output, 'screenshots');
const rawVideoDirectory = path.join(output, 'raw-video');
await mkdir(screenshotDirectory, { recursive: true });
await mkdir(rawVideoDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: rawVideoDirectory, size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
const servedTitle = await page.title();
const servedBody = await page.locator('body').innerText();
if (!servedTitle.includes("Iron Kestrel '87") || !servedBody.includes(RELEASE_INFO.displayVersion)) {
  throw new Error(`Store capture refused a wrong or stale application: ${servedTitle}`);
}
await page.waitForFunction(() => Boolean((window as Window & { __STRIKE_VECTOR_VISUAL_AUDIT__?: unknown }).__STRIKE_VECTOR_VISUAL_AUDIT__));

const scenes = [
  { mission: 0, progress: 0.16, file: '01-carrier-launch.png', label: 'Mission 1 carrier launch' },
  { mission: 0, progress: 0.56, file: '02-coastal-interception.png', label: 'Mission 1 coastal interception' },
  { mission: 5, progress: 0.28, file: '03-storm-fleet-defence.png', label: 'Mission 6 storm fleet defence' },
  { mission: 5, progress: 0.68, file: '04-sea-skimming-threat.png', label: 'Mission 6 naval engagement' },
  { mission: 9, progress: 0.32, file: '05-bastion-approach.png', label: 'Mission 10 Bastion approach' },
  { mission: 9, progress: 0.72, file: '06-bastion-withdrawal.png', label: 'Mission 10 withdrawal' },
];

type VisualAudit = { openMission: (index: number, routeProgress?: number) => { missionId: string } };
const captures: Array<{ file: string; label: string; missionId: string; width: number; height: number; sha256: string }> = [];
for (const scene of scenes) {
  const result = await page.evaluate(({ mission, progress }) => (
    window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: VisualAudit }
  ).__STRIKE_VECTOR_VISUAL_AUDIT__.openMission(mission, progress), scene);
  await page.waitForTimeout(1800);
  const target = path.join(screenshotDirectory, scene.file);
  await page.locator('.game-stage').screenshot({ path: target });
  const bytes = await readFile(target);
  captures.push({ file: `screenshots/${scene.file}`, label: scene.label, missionId: result.missionId, width: 1920, height: 1080, sha256: createHash('sha256').update(bytes).digest('hex') });
  await page.waitForTimeout(1200);
}

const video = page.video();
await context.close();
let trailer: { file: string; width: number; height: number; bytes: number; sha256: string; source: string } | null = null;
if (video) {
  const trailerPath = path.join(output, 'gameplay-trailer-master.webm');
  await video.saveAs(trailerPath);
  const bytes = await readFile(trailerPath);
  trailer = { file: 'gameplay-trailer-master.webm', width: 1920, height: 1080, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), source: 'Recorded game-stage output only' };
}
await browser.close();

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  releaseVersion: RELEASE_INFO.version,
  buildId: RELEASE_INFO.buildId,
  sourceUrl: baseUrl,
  servedTitle,
  policy: 'Captured game-stage output only; no concept-art or marketing-copy frames.',
  captures,
  trailer,
};
await writeFile(path.join(output, 'gameplay-media-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Captured ${captures.length} gameplay-only Steam screenshots and a WebM gameplay master.`);
