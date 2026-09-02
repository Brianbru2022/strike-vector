import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.env.SHOWCASE_CAPTURE_URL || 'http://127.0.0.1:4178';
const outputDirectory = join(process.cwd(), 'reports', 'showcase-media');
const videoDirectory = join(outputDirectory, 'raw-video');
await mkdir(videoDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDirectory, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean((window as Window & { __STRIKE_VECTOR_VISUAL_AUDIT__?: unknown }).__STRIKE_VECTOR_VISUAL_AUDIT__));

const scenes = [
  { mission: 0, progress: 0.18, name: '01-carrier-qualification' },
  { mission: 5, progress: 0.5, name: '02-fleet-defence' },
  { mission: 9, progress: 0.66, name: '03-bastion-assault' },
];

for (const scene of scenes) {
  await page.evaluate(({ mission, progress }) => (
    window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { openMission: (index: number, routeProgress?: number) => unknown } }
  ).__STRIKE_VECTOR_VISUAL_AUDIT__.openMission(mission, progress), scene);
  await page.waitForTimeout(1300);
  await page.locator('.game-stage').screenshot({ path: join(outputDirectory, `${scene.name}.png`) });
  await page.waitForTimeout(900);
}

const video = page.video();
await context.close();
if (video) await copyFile(await video.path(), join(outputDirectory, 'north-atlantic-showcase-tour.webm'));
await browser.close();
await writeFile(join(outputDirectory, 'README.md'), [
  '# North Atlantic showcase media',
  '',
  '- `01-carrier-qualification.png` — signature dawn/carrier sortie.',
  '- `02-fleet-defence.png` — signature storm/naval battle.',
  '- `03-bastion-assault.png` — signature fortress assault.',
  '- `north-atlantic-showcase-tour.webm` — short captured tour of all three scenes.',
  '',
].join('\n'), 'utf8');
console.log(`Captured ${scenes.length} showcase frames and one WebM tour in ${outputDirectory}.`);

