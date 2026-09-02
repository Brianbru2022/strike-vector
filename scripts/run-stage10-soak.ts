import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { RELEASE_INFO } from '../src/game/Release';

const smoke = process.argv.includes('--smoke');
const requestedMinutes = smoke ? 0.2 : Number(process.env.STAGE10_SOAK_MINUTES ?? 180);
if (!Number.isFinite(requestedMinutes) || requestedMinutes <= 0) throw new Error('STAGE10_SOAK_MINUTES must be a positive number.');
const requiredMinutes = 180;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4185', '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
const pageErrors: string[] = [];
const samples: Array<{ elapsedSeconds: number; heapBytes: number | null }> = [];
const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch('http://127.0.0.1:4185')).ok) return; } catch { /* Wait for preview. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Production preview did not start for the soak harness.');
};

let browser;
const startedAt = new Date();
try {
  await waitForServer();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:4185');
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  const durationMs = requestedMinutes * 60_000;
  const begin = Date.now();
  while (Date.now() - begin < durationMs) {
    await page.keyboard.press('KeyW');
    await page.keyboard.press('KeyD');
    const heapBytes = await page.evaluate(() => {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      return memory?.usedJSHeapSize ?? null;
    });
    samples.push({ elapsedSeconds: Math.round((Date.now() - begin) / 1000), heapBytes });
    await page.waitForTimeout(Math.min(5000, Math.max(50, durationMs - (Date.now() - begin))));
  }
} finally {
  await browser?.close();
  server.kill();
}
const completedAt = new Date();
const certificationEligible = requestedMinutes >= requiredMinutes && pageErrors.length === 0;
const report = {
  schemaVersion: 1, buildId: RELEASE_INFO.buildId, startedAt: startedAt.toISOString(), completedAt: completedAt.toISOString(),
  requestedMinutes, requiredMinutes, certificationEligible, pageErrors, samples,
  exclusions: ['OS suspend/resume requires a human Windows run.', 'Physical controller reconnection requires real hardware.', 'This harness does not approve minimum-spec performance.'],
};
const output = path.join(process.cwd(), 'reports/stage10', smoke ? 'soak-smoke.json' : `soak-${RELEASE_INFO.buildId}.json`);
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Stage 10 soak: ${requestedMinutes} minute(s); certification eligible: ${certificationEligible ? 'yes' : 'no'}.`);
if (!smoke && !certificationEligible) process.exitCode = 1;
