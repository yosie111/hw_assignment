// src/automation/sites/saucedemo/flows/loginFlow.js

const S = require('../selectors');

/**
 * Steps 1-2: Navigate to site → Login → Validate success
 * After successful login, Saucedemo redirects to /inventory.html (the catalog page).
 * This means Step 3 (Navigate to catalog) is completed automatically.
 *
 * @param {import('playwright').Page} page
 * @param {{ username: string, password: string, baseUrl: string }} creds
 * @throws {Error} If login fails (bad credentials or timeout)
 */
async function login(page, { username, password, baseUrl }) {
  // First navigation can be slow — use 30s timeout
  await page.goto(baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  await page.locator(S.LOGIN_USERNAME).fill(username);
  await page.locator(S.LOGIN_PASSWORD).fill(password);
  await page.locator(S.LOGIN_BUTTON).click();

  // Validate: either inventory loads (success) or error appears (failure)
  const errorLocator = page.locator(S.LOGIN_ERROR);
  const inventoryLocator = page.locator(S.INVENTORY_LIST);

  const result = await Promise.race([
    inventoryLocator.waitFor({ state: 'visible' }).then(() => 'success'),
    errorLocator.waitFor({ state: 'visible' }).then(() => 'error'),
  ]);

  if (result === 'error') {
    const errorText = await errorLocator.textContent();
    throw new Error(`Login failed: ${errorText}`);
  }
}

module.exports = { login };
