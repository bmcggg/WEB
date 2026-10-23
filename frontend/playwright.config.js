import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.FELLA_E2E_URL || 'http://127.0.0.1:5000',
    trace: 'retain-on-failure',
  },
});
