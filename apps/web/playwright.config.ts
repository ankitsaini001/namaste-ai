import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);

/**
 * Browser tests against the real stack: web, API and worker from their production builds, with
 * MongoDB and Mailpit from infra/docker-compose.dev.yml. Locally, servers already running are reused.
 * Run with `pnpm test:e2e` from the repository root.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: '../api',
      url: 'http://localhost:4000/v1/health/ready',
      reuseExistingServer: !CI,
    },
    {
      command: 'node dist/worker.js',
      cwd: '../api',
      wait: { stdout: /Worker ready/ },
      reuseExistingServer: !CI,
    },
    {
      command: 'node_modules/.bin/next start --port 3000',
      url: 'http://localhost:3000',
      reuseExistingServer: !CI,
    },
  ],
});
