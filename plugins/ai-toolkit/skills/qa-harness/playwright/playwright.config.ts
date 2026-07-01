import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

// Base URLs per environment, selected via --project=dev|staging. Tests read
// CLIENT_ID from process.env (tenant URL = `${baseURL}/admin/${CLIENT_ID}`).
const BASE_URLS: Record<string, string> = {
  dev: 'https://dev.aware3.net',
  staging: 'http://cs-dev.aware3.net',
};

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Flake retries only - kept low so flakiness can't mask a real failure.
  retries: Number(process.env.PW_RETRIES ?? 0),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Map Playwright's getByTestId() to the app's data-qaid attribute.
    testIdAttribute: 'data-qaid',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'dev', use: { ...devices['Desktop Chrome'], baseURL: BASE_URLS.dev } },
    { name: 'staging', use: { ...devices['Desktop Chrome'], baseURL: BASE_URLS.staging } },
  ],
});
