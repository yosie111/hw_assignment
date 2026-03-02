// src/automation/sites/toolshop/flows/loginFlow.js
//
// Steps 1-2: Navigate to ToolShop → Login → Validate success
//
// ToolShop login page: /auth/login
// After successful login the user menu appears in the navbar.

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');

/**
 * Login to ToolShop.
 *
 * @param {import('playwright').Page} page
 * @param {{ email: string, password: string, baseUrl: string }} creds
 * @throws {Error} If login fails (bad credentials or timeout)
 */
async function login(page, { email, password, baseUrl }) {
  // Navigate to login page
  await page.goto(`${baseUrl}/auth/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  // Wait for login form to appear
  await page.locator(S.LOGIN_EMAIL).waitFor({ state: 'visible', timeout: 15_000 });

  // Fill credentials
  await page.locator(S.LOGIN_EMAIL).fill(email);
  await page.locator(S.LOGIN_PASSWORD).fill(password);

  // Submit with retry — network can be flaky
  await withRetry(async () => {
    await page.locator(S.LOGIN_SUBMIT).click();

    // Wait for one of: user menu (success) or error message (failure)
    const errorLocator = page.locator(S.LOGIN_ERROR);
    const successLocator = page.locator(S.NAV_USER_MENU);

    const result = await Promise.race([
      successLocator.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'success'),
      errorLocator.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'error'),
    ]);

    if (result === 'error') {
      const errorText = await errorLocator.textContent();
      throw new Error(`Login failed: ${errorText.trim()}`);
    }
  }, { label: 'ToolShop-Login', maxAttempts: 2 });
}

module.exports = { login };
