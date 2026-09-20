import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/itch-e2e',
  webServer: {
    command: 'pnpm itch:preview',
    url: 'http://127.0.0.1:4186/api/health',
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://127.0.0.1:4186', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-itch', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-itch', use: { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
  ],
});
