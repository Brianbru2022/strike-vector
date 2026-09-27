import { expect, test, type Page } from '@playwright/test';

const monitorFailures = (page: Page) => {
  const failures: string[] = [];
  const responses: string[] = [];
  page.on('requestfailed', (request) => failures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'failed'}`));
  page.on('response', (response) => {
    responses.push(response.url());
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => failures.push(`page: ${error.message}`));
  return { failures, responses };
};

test('runs the paid-game browser build inside an itch-style nested iframe', async ({ page }) => {
  const { failures, responses } = monitorFailures(page);

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
  await expect.poll(() => responses.some((url) => /\.(?:png|jpe?g|webp)(?:\?|$)/i.test(url))).toBe(true);
  await expect.poll(() => responses.some((url) => /\.wav(?:\?|$)/i.test(url))).toBe(true);
  expect(failures).toEqual([]);
});

test('loads lazy screens, persists saves and registers no service worker', async ({ page, context }) => {
  const { failures } = monitorFailures(page);
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
  await expect(page.getByRole('link', { name: 'SEND BETA FEEDBACK' })).toHaveAttribute(
    'href',
    'https://github.com/Brianbru2022/strike-vector/issues/new?template=beta-feedback.yml',
  );
  const betaRecordDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'EXPORT BETA PLAY RECORD' }).click();
  expect((await betaRecordDownload).suggestedFilename()).toBe('iron-kestrel-87-beta-evidence-v1.json');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('IRON_KESTREL_EXTERNAL_BETA_EVIDENCE_V1') ?? 'null')?.events?.some((event: { type?: string }) => event.type === 'SESSION_STARTED'))).toBe(true);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  const cacheNames = await context.pages()[0].evaluate(() => caches.keys());
  expect(cacheNames).toEqual([]);
  expect(failures).toEqual([]);
});

test('serves every packaged file and transitions into the next campaign mission', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name !== 'desktop-itch', 'The complete package inventory is downloaded once in the desktop itch project.');
  const manifestResponse = await page.request.get('/games/iron-kestrel/itch-build-manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json() as { files: Array<{ path: string; bytes: number }>; assetClasses: { images: number; audio: number; scripts: number }; configuredFeedbackUrl: string | null; feedbackUrlEmbedded: boolean };
  expect(manifest.assetClasses.images).toBeGreaterThan(0);
  expect(manifest.assetClasses.audio).toBeGreaterThan(0);
  expect(manifest.assetClasses.scripts).toBeGreaterThan(0);
  expect(manifest.configuredFeedbackUrl).toBe('https://github.com/Brianbru2022/strike-vector/issues/new?template=beta-feedback.yml');
  expect(manifest.feedbackUrlEmbedded).toBe(true);

  const failedFiles: string[] = [];
  for (const entry of manifest.files) {
    const response = await page.request.get(`/games/iron-kestrel/${entry.path}`);
    if (!response.ok() || Number(response.headers()['content-length'] ?? entry.bytes) <= 0) failedFiles.push(entry.path);
  }
  expect(failedFiles).toEqual([]);

  await page.addInitScript(() => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify({
    version: 3,
    unlockedMission: 1,
    completedMissionIds: ['m1_coastal_strike'],
    bestScores: {},
    campaignFlags: [],
    difficulty: 'PILOT',
    renderQuality: 'HIGH',
    controlScale: 1,
    controlOpacity: 0.82,
    leftHanded: false,
  })));
  const { failures } = monitorFailures(page);
  await page.goto('/games/iron-kestrel/');
  await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
  await page.getByRole('button', { name: 'Open Mission 2: Fjord SAM Suppression', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION VIPER CANYON' })).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText('OP VIPER CANYON')).toBeVisible();
  expect(failures).toEqual([]);
});
