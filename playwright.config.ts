import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl || 'http://127.0.0.1:4177';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: externalBaseUrl ? undefined : {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:4177/api/health',
    reuseExistingServer: true,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-landscape', use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  ],
});
