import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './scripts/review',
  testMatch: '*.spec.mjs',
  outputDir: 'review-results',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'review-report', open: 'never' }]],
  use: {
    browserName: 'chromium',
    actionTimeout: 15_000,
    baseURL: 'http://127.0.0.1:5186',
    viewport: { width: 1440, height: 1000 },
    timezoneId: 'UTC',
    locale: 'en-US',
    colorScheme: 'dark',
    serviceWorkers: 'block',
    video: { mode: 'on', size: { width: 1440, height: 1000 } },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/review/server.mjs',
    url: 'http://127.0.0.1:5186',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
