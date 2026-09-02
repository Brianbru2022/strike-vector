import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.env.NORWEGIAN_CAPTURE_URL || 'http://127.0.0.1:4178';
const outputDirectory = join(process.cwd(), 'reports', 'norwegian-release', 'media');
const rawVideoDirectory = join(outputDirectory, 'raw-video');
await mkdir(rawVideoDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: rawVideoDirectory, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean((window as Window & { __STRIKE_VECTOR_VISUAL_AUDIT__?: unknown }).__STRIKE_VECTOR_VISUAL_AUDIT__));

const scenes = [
  { mission: 10, progress: 0.2, name: '11-cold-passage' },
  { mission: 11, progress: 0.52, name: '12-hammerfall-fjord' },
  { mission: 12, progress: 0.6, name: '13-troms-bridgehead' },
  { mission: 13, progress: 0.47, name: '14-whiteout-rescue' },
  { mission: 14, progress: 0.58, name: '15-red-tide' },
  { mission: 15, progress: 0.7, name: '16-north-cape-assault' },
];

for (const scene of scenes) {
  await openMission(scene.mission, scene.progress);
  await page.waitForTimeout(900);
  await page.locator('.game-stage').screenshot({ path: join(outputDirectory, `${scene.name}-desktop.png`) });
}

await page.setViewportSize({ width: 3440, height: 1440 });
await openMission(15, 0.72);
await page.waitForTimeout(900);
await page.locator('.game-stage').screenshot({ path: join(outputDirectory, '16-north-cape-assault-ultrawide.png') });

await page.setViewportSize({ width: 844, height: 390 });
await openMission(13, 0.48);
await page.waitForTimeout(900);
await page.locator('.game-stage').screenshot({ path: join(outputDirectory, '14-whiteout-rescue-mobile.png') });

await page.setViewportSize({ width: 1280, height: 720 });
await openMission(15, 0.25);
await page.keyboard.down('d');
await page.keyboard.down('w');
await page.waitForTimeout(4500);
await page.keyboard.up('w');
await page.keyboard.up('d');
await page.waitForTimeout(1200);

const video = page.video();
await context.close();
if (video) await copyFile(await video.path(), join(outputDirectory, 'north-cape-gameplay.webm'));
await browser.close();
await writeFile(join(outputDirectory, 'README.md'), [
  '# Norwegian expansion release media',
  '',
  '- Six desktop promotional frames cover Missions 11-16.',
  '- `16-north-cape-assault-ultrawide.png` verifies the ultrawide presentation crop.',
  '- `14-whiteout-rescue-mobile.png` verifies compact mobile landscape presentation.',
  '- `north-cape-gameplay.webm` is a short locally captured expansion gameplay sequence.',
  '',
].join('\n'), 'utf8');
console.log(`Captured ${scenes.length + 2} Norwegian release frames and one WebM sequence in ${outputDirectory}.`);

async function openMission(mission: number, progress: number): Promise<void> {
  await page.evaluate(({ missionIndex, routeProgress }) => (
    window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { openMission: (index: number, progress?: number) => unknown } }
  ).__STRIKE_VECTOR_VISUAL_AUDIT__.openMission(missionIndex, routeProgress), { missionIndex: mission, routeProgress: progress });
}
