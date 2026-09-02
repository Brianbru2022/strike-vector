import { expect, test } from '@playwright/test';
import { RELEASE_INFO } from '../../src/game/Release';

test('consumer build presents one approved identity and a readable first-run route', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Iron Kestrel '87/);
  await expect(page.getByRole('heading', { name: 'IRON KESTREL' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'START GUIDED CAMPAIGN' })).toBeVisible();
  await expect(page.getByText(RELEASE_INFO.displayVersion)).toBeVisible();
  await expect(page.getByText(String(RELEASE_INFO.channel) === 'RELEASE_CANDIDATE' ? 'RELEASE CANDIDATE' : 'DEVELOPMENT BUILD')).toBeVisible();
  await expect(page.getByRole('button', { name: 'VALIDATION RUNS' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'MISSION AUTHORING' })).toHaveCount(0);
  const body = await page.locator('body').boundingBox();
  expect(body).not.toBeNull();
  expect(body!.width).toBeLessThanOrEqual((await page.viewportSize())!.width);
});
