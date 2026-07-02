import { test as setup, expect } from '@playwright/test';

// Log in once and persist the session. The real specs reuse this via
// storageState, so they never hit the login endpoint per-test (which got
// throttled when every test logged in fresh).
const authFile = '.auth/dev.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(process.env.QA_USER ?? '');
  await page.getByTestId('login-password-input').fill(process.env.QA_PASS ?? '');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-email-input')).toBeHidden({ timeout: 30_000 });
  await page.context().storageState({ path: authFile });
});
