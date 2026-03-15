// src/automation/sites/toolshop/flows/loginFlow.js
//
// Steps 1-2: Navigate to ToolShop → Login → Validate success
//
// ★ Auto-registration: practicesoftwaretesting.com resets its DB every few minutes.
//   Before login, we call the REST API to ensure the account exists.
//   This adds ~200ms but prevents "Invalid credentials" failures.
//
// ★ IMPROVEMENT (v2):
//   - Checks registerAccount result — warns on failure instead of silent ignore
//   - If registration fails due to network/timeout, logs a clear warning
//     but still attempts login (account might exist from a previous session)

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');
const { registerAccount } = require('./registerFlow');

/**
 * Login to ToolShop.
 * Automatically registers the account first (in case DB was reset).
 *
 * @param {import('playwright').Page} page
 * @param {{ email: string, password: string, baseUrl: string, apiUrl: string }} creds
 * @throws {Error} If login fails after registration + retry
 */
async function login(page, { email, password, baseUrl, apiUrl }) {
  // ★ Step 0: Ensure account exists (DB resets every few minutes)
  if (apiUrl) {
    const regResult = await registerAccount({ email, password, apiUrl });

    if (!regResult.success) {
      // Registration failed — log warning but still attempt login.
      // The account might already exist from a previous run,
      // and the failure could be a transient network issue.
      console.warn(
        `[loginFlow] ⚠ Registration failed (${regResult.error}). ` +
        `Attempting login anyway — account may already exist.`
      );
    }
    // If regResult.success && regResult.alreadyExists — that's fine, expected behavior
  }

  // Step 1: Navigate to login page
  await page.goto(`${baseUrl}/auth/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  // Wait for login form to appear
  await page.locator(S.LOGIN_EMAIL).waitFor({ state: 'visible', timeout: 15_000 });

  // Step 2: Fill credentials and submit with retry
  await withRetry(async () => {
    await page.locator(S.LOGIN_EMAIL).fill(email);
    await page.locator(S.LOGIN_PASSWORD).fill(password);

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
