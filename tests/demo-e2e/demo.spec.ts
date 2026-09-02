import { expect, test } from '@playwright/test';

test('exposes only the two focused demo routes and restrained Windows link', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle("Iron Kestrel '87 Demo");
  const domReadyMs = await page.evaluate(() => performance.getEntriesByType('navigation')[0] ? (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).domContentLoadedEventEnd : 0);
  expect(domReadyMs).toBeLessThan(3000);
  await expect(page.getByText('FOCUSED BROWSER DEMO')).toBeVisible();
  await expect(page.getByRole('button', { name: 'PLAY GUIDED MISSION 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'FLEET DEFENCE CHALLENGE' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'WINDOWS EDITION DETAILS' })).toHaveAttribute('href', '/commercial-edition.html');
  await expect(page.getByText('DYNAMIC OPERATIONS')).toHaveCount(0);
  await expect(page.getByText('VALIDATION RUNS')).toHaveCount(0);
  await expect(page.getByText('MISSION AUTHORING')).toHaveCount(0);
});

test('launches Guided Mission 1 and the replayable Fleet Defence challenge', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY GUIDED MISSION 1' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION DECK TEST' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'GUIDED', exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'FLEET DEFENCE CHALLENGE' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION SEA SHIELD' })).toBeVisible();
});

test('keeps the commercial hand-off outside gameplay and makes no premature availability claim', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'WINDOWS EDITION DETAILS' }).click();
  await expect(page).toHaveTitle(/Windows Edition/);
  await expect(page.getByText(/complete sixteen-mission campaign/i)).toBeVisible();
  await expect(page.getByText(/availability will be announced/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to the browser demo' })).toBeVisible();
});

test('keeps demo data away from the paid save namespace', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4', 'PAID-SAVE-SENTINEL'));
  await page.goto('/');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'EXPORT DEMO RECORD' }).click();
  expect((await download).suggestedFilename()).toBe('iron-kestrel-demo-record-v1.json');
  expect(await page.evaluate(() => localStorage.getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4'))).toBe('PAID-SAVE-SENTINEL');
  expect(await page.evaluate(() => Object.keys(localStorage).every((key) => key === 'STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4' || key.startsWith('IRON_KESTREL_DEMO_')))).toBe(true);
});

test('replays the installed demo offline after one successful load', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'FLEET DEFENCE CHALLENGE' })).toBeVisible();
  expect(await page.evaluate(async () => (await fetch('/assets/audio/pegasus-engine-loop-v2.wav')).ok)).toBe(true);
  await page.getByRole('button', { name: 'FLEET DEFENCE CHALLENGE' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION SEA SHIELD' })).toBeVisible();
});
