import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const baseUrl = process.env.VISUAL_AUDIT_URL || 'http://127.0.0.1:4178';
const outputDirectory = join(process.cwd(), 'reports', 'combat-effects');
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean((window as Window & { __STRIKE_VECTOR_VISUAL_AUDIT__?: unknown }).__STRIKE_VECTOR_VISUAL_AUDIT__));

const modes = ['LAUNCH', 'IMPACT', 'DESTRUCTION'] as const;
for (const mode of modes) {
  await page.evaluate((selectedMode) => (
    window as unknown as {
      __STRIKE_VECTOR_VISUAL_AUDIT__: { showCombatEffects: (mode: typeof selectedMode) => void };
    }
  ).__STRIKE_VECTOR_VISUAL_AUDIT__.showCombatEffects(selectedMode), mode);
  await page.waitForTimeout(mode === 'LAUNCH' ? 40 : mode === 'IMPACT' ? 120 : 180);
  await page.locator('canvas').first().screenshot({ path: join(outputDirectory, `${mode.toLowerCase()}.png`) });
}

await browser.close();
await writeFile(join(outputDirectory, 'README.md'), [
  '# Combat effects visual acceptance',
  '',
  `Captured from ${baseUrl}.`,
  '',
  '- [Launch signatures](./launch.png)',
  '- [Weapon impacts](./impact.png)',
  '- [Damage and destruction progression](./destruction.png)',
  '',
].join('\n'), 'utf8');
console.log(`Captured ${modes.length} combat-effects screenshots in ${outputDirectory}.`);
