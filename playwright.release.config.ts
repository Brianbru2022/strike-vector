import { defineConfig } from '@playwright/test';

const viewports = [
  ['720p', 1280, 720], ['1080p', 1920, 1080], ['1440p', 2560, 1440],
  ['ultrawide', 3440, 1440], ['compact-mobile', 844, 390],
] as const;

export default defineConfig({
  testDir: './tests/release-e2e',
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4184 --strictPort',
    url: 'http://127.0.0.1:4184', reuseExistingServer: false,
  },
  use: { baseURL: 'http://127.0.0.1:4184', trace: 'retain-on-failure' },
  projects: viewports.map(([name, width, height]) => ({
    name, use: { viewport: { width, height }, hasTouch: name === 'compact-mobile', isMobile: name === 'compact-mobile' },
  })),
});
