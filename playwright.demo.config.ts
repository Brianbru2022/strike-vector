import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/demo-e2e',
  webServer: {
    command: 'pnpm demo:preview',
    url: 'http://127.0.0.1:4183/',
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://127.0.0.1:4183', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-demo', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-demo', use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  ],
});
