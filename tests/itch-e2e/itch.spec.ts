import { expect, test } from '@playwright/test';

test('runs the paid-game browser build inside an itch-style nested iframe', async ({ page }) => {
  const failures: string[] = [];
  page.on('requestfailed', (request) => failures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`));
  page.on('response', (response) => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });

  await page.goto('/itch-host.html');
  const game = page.frameLocator('iframe[title="Iron Kestrel \'87 itch game"]');
  await expect(game.getByRole('heading', { name: 'IRON KESTREL' })).toBeVisible();
  await expect(game.getByText('VALIDATION RUNS')).toHaveCount(0);
  await expect(game.getByText('MISSION AUTHORING')).toHaveCount(0);
  await game.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await expect(game.getByRole('heading', { name: 'OPERATION DECK TEST' })).toBeVisible();
  await expect(game.getByRole('button', { name: 'GUIDED', exact: true })).toBeVisible();
  await game.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(game.getByText(/FLIGHT SCHOOL [1-9]\/9/)).toBeVisible({ timeout: 15_000 });
  expect(failures).toEqual([]);
});

test('loads lazy screens, persists saves and registers no service worker', async ({ page, context }) => {
  await page.goto('/games/iron-kestrel/');
  await page.getByRole('button', { name: 'LANDING PRACTICE' }).click();
  await expect(page.getByRole('heading', { name: 'LANDING PRACTICE' })).toBeVisible();
  await expect(page.getByRole('button', { name: /ROLLING CARRIER RECOVERY/i })).toBeVisible();
  await page.getByRole('button', { name: 'Close landing practice' }).click();
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await page.getByRole('button', { name: 'STANDARD', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4'))).not.toBeNull();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'IRON KESTREL' })).toBeVisible();
  await page.getByRole('button', { name: 'SYSTEM SETTINGS' }).click();
  const betaRecordDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'EXPORT BETA PLAY RECORD' }).click();
  expect((await betaRecordDownload).suggestedFilename()).toBe('iron-kestrel-87-beta-evidence-v1.json');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('IRON_KESTREL_EXTERNAL_BETA_EVIDENCE_V1') ?? 'null')?.events?.some((event: { type?: string }) => event.type === 'SESSION_STARTED'))).toBe(true);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  const cacheNames = await context.pages()[0].evaluate(() => caches.keys());
  expect(cacheNames).toEqual([]);
});
