import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { RELEASE_INFO } from '../src/game/Release';
import { VisualCaptureManifestV1 } from '../src/types/game';

const baseUrl = process.env.VISUAL_AUDIT_URL || 'http://127.0.0.1:4178';
const outputDirectory = join(process.cwd(), 'reports', 'visual-integration');
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
const servedTitle = await page.title();
const initialBody = await page.locator('body').innerText();
if (!servedTitle.includes("Iron Kestrel '87") || !initialBody.includes(RELEASE_INFO.displayVersion)) {
  throw new Error(`Visual capture refused: expected Iron Kestrel ${RELEASE_INFO.displayVersion}, received "${servedTitle}".`);
}
await page.waitForFunction(() => Boolean((window as Window & { __STRIKE_VECTOR_VISUAL_AUDIT__?: unknown }).__STRIKE_VECTOR_VISUAL_AUDIT__));

const records: Array<{ mission: number; missionId: string; focusX: number; screenshot: string }> = [];
const captureRecords: Array<Omit<VisualCaptureManifestV1['captures'][number], 'sha256'>> = [];
const assertSingleCentralNotification = async (missionId: string) => {
  const count = await page.locator('[data-hud-region="central-notification"]').count();
  if (count > 1) throw new Error(`HUD notification audit failed for ${missionId}: ${count} central messages rendered.`);
};
const assertReadableHudText = async (missionId: string) => {
  const result = await page.evaluate(() => {
    const hud = document.querySelector('#game-hud');
    if (!hud) return { minimum: 0, sample: 'HUD missing' };
    const visibleText = [...hud.querySelectorAll<HTMLElement>('*')].filter((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return Boolean(element.textContent?.trim()) && bounds.width > 0 && bounds.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    const smallest = visibleText.reduce<{ size: number; sample: string }>((current, element) => {
      const size = Number.parseFloat(getComputedStyle(element).fontSize);
      return Number.isFinite(size) && size < current.size ? { size, sample: element.textContent?.trim().slice(0, 60) ?? '' } : current;
    }, { size: Number.POSITIVE_INFINITY, sample: '' });
    return { minimum: smallest.size, sample: smallest.sample };
  });
  if (result.minimum < 10.99) throw new Error(`HUD readability audit failed for ${missionId}: ${result.minimum}px text in "${result.sample}".`);
};
for (let index = 0; index < 16; index++) {
  const focus = await page.evaluate((missionIndex) => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { openMission: (index: number) => { missionId: string; focusX: number } } }).__STRIKE_VECTOR_VISUAL_AUDIT__.openMission(missionIndex), index);
  await page.waitForTimeout(700);
  await assertSingleCentralNotification(focus.missionId);
  const screenshot = `mission-${String(index + 1).padStart(2, '0')}-objective.png`;
  await page.locator('canvas').first().screenshot({ path: join(outputDirectory, screenshot) });
  records.push({ mission: index + 1, ...focus, screenshot });
  captureRecords.push({ file: screenshot, missionId: focus.missionId, missionNumber: index + 1, viewport: 'objective', width: 1280, height: 720, routeProgress: null });
}

const routeChecks: string[] = [];
for (let index = 0; index < 16; index++) {
  for (const progress of [0.22, 0.5, 0.78]) {
    const focus = await page.evaluate(
      ({ missionIndex, routeProgress }) => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { openMission: (index: number, progress?: number) => unknown } }).__STRIKE_VECTOR_VISUAL_AUDIT__.openMission(missionIndex, routeProgress),
      { missionIndex: index, routeProgress: progress },
    ) as { missionId: string };
    await page.waitForTimeout(250);
    await assertSingleCentralNotification(focus.missionId);
    const screenshot = `mission-${String(index + 1).padStart(2, '0')}-route-${Math.round(progress * 100)}.jpg`;
    await page.locator('canvas').first().screenshot({ path: join(outputDirectory, screenshot), type: 'jpeg', quality: 82 });
    routeChecks.push(screenshot);
    captureRecords.push({ file: screenshot, missionId: focus.missionId, missionNumber: index + 1, viewport: 'route', width: 1280, height: 720, routeProgress: progress });
  }
}

const viewportChecks: string[] = [];
for (const viewport of [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'ultrawide', width: 3440, height: 1440 },
  { name: 'mobile-landscape', width: 844, height: 390 },
]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  for (let index = 0; index < 16; index++) {
    const focus = await page.evaluate((missionIndex) => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { openMission: (index: number) => unknown } }).__STRIKE_VECTOR_VISUAL_AUDIT__.openMission(missionIndex), index) as { missionId: string };
    await page.waitForTimeout(240);
    await assertSingleCentralNotification(focus.missionId);
    await assertReadableHudText(focus.missionId);
    const screenshot = `mission-${String(index + 1).padStart(2, '0')}-${viewport.name}.jpg`;
    await page.screenshot({ path: join(outputDirectory, screenshot), type: 'jpeg', quality: 80 });
    viewportChecks.push(screenshot);
    captureRecords.push({ file: screenshot, missionId: focus.missionId, missionNumber: index + 1, viewport: viewport.name, width: viewport.width, height: viewport.height, routeProgress: null });
  }
}

await browser.close();
const captures: VisualCaptureManifestV1['captures'] = [];
for (const record of captureRecords) {
  const bytes = await readFile(join(outputDirectory, record.file));
  captures.push({ ...record, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const manifest: VisualCaptureManifestV1 = {
  version: 1,
  releaseVersion: RELEASE_INFO.version,
  buildId: RELEASE_INFO.buildId,
  generatedAt: new Date().toISOString(),
  servedTitle,
  sourceUrl: baseUrl,
  captures,
};
await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
const markdown = [
  '# Visual Integration Matrix',
  '',
  `Generated from ${baseUrl}. Includes objective contact checks and route samples at 22%, 50% and 78% for every mission.`,
  '',
  '| Mission | Focus world X | Screenshot |',
  '| --- | ---: | --- |',
  ...records.map((record) => `| ${record.mission}: ${record.missionId} | ${Math.round(record.focusX)} | [${record.screenshot}](./${record.screenshot}) |`),
  '',
  `Viewport coverage captures: ${viewportChecks.length} across desktop, ultrawide and mobile landscape.`,
  '',
  `Route coverage captures: ${routeChecks.length}.`,
  `Build: ${RELEASE_INFO.buildId}. Manifest: [manifest.json](./manifest.json).`,
  '',
].join('\n');
await writeFile(join(outputDirectory, 'README.md'), `${markdown}\n`, 'utf8');
console.log(`Captured ${records.length + routeChecks.length + viewportChecks.length} visual-integration screenshots in ${outputDirectory}.`);
