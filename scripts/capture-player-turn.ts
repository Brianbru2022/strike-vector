import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { RELEASE_INFO } from '../src/game/Release';

const baseUrl = process.env.VISUAL_AUDIT_URL || 'http://127.0.0.1:4177';
const outputDirectory = join(process.cwd(), 'reports', 'player-turn');
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
if (!(await page.title()).includes("Iron Kestrel '87")) throw new Error('Player-turn capture refused the wrong application.');
await page.waitForFunction(() => Boolean((window as Window & { __STRIKE_VECTOR_VISUAL_AUDIT__?: unknown }).__STRIKE_VECTOR_VISUAL_AUDIT__));
await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { openMission: (index: number, progress: number) => unknown } }).__STRIKE_VECTOR_VISUAL_AUDIT__.openMission(0, 0.5));
await page.waitForTimeout(350);

for (let frame = 0; frame < 5; frame++) {
  await page.evaluate((frameIndex) => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { stagePlayerTurnFrame: (frame: number) => void } }).__STRIKE_VECTOR_VISUAL_AUDIT__.stagePlayerTurnFrame(frameIndex), frame);
  await page.waitForTimeout(50);
  await page.locator('canvas').first().screenshot({ path: join(outputDirectory, `turn-${frame + 1}.png`) });
}
await browser.close();

await writeFile(join(outputDirectory, 'README.md'), [
  '# Player reversal visual evidence', '',
  `Build: ${RELEASE_INFO.buildId}.`,
  `Captured from ${baseUrl} using the development-only paused heading inspector. Normal input traversal is certified by PlayerAircraft.test.ts.`, '',
  ...[1, 2, 3, 4, 5].map((frame) => `- [Turn frame ${frame}](./turn-${frame}.png)`), '',
].join('\n'), 'utf8');
console.log(`Captured 5/5 authored player-turn frames in ${outputDirectory}.`);
