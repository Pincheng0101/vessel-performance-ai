import type { ConfigOptions } from '@nuxt/test-utils/playwright';
import { defineConfig } from '@playwright/test';

export default defineConfig<ConfigOptions>({
  globalSetup: './tests/integration/global-setup.js',
  use: {
    nuxt: {
      host: 'http://localhost:3000',
    },
    baseURL: 'http://localhost:3000',
    storageState: 'playwright/.auth/user.json',
  },
  projects: [
    {
      name: 'dev',
      testDir: './tests/integration/dev',
      timeout: 60 * 1000,
      retries: process.env.CI ? 2 : 0,
    },
    {
      name: 'platform',
      testDir: './tests/integration/platform',
      timeout: 120 * 1000,
      retries: process.env.CI ? 1 : 0,
    },
  ],
  fullyParallel: true,
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'playwright-report/test-results.xml' }],
        ['json', { outputFile: 'playwright-report/test-results.json' }],
      ]
    : [
        ['list'],
        ['json', { outputFile: 'playwright-report/test-results.json' }],
      ],
});
