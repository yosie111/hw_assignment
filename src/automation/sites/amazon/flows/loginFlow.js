// src/automation/sites/amazon/flows/loginFlow.js

const S = require('../selectors');
const config = require('../../../config');

/**
 * Amazon login flow: Navigate → Sign In → Fill credentials → Validate success
 *
 * Supports saved session cookies — if already logged in, skips login flow.
 * Amazon may show captcha or 2FA challenges which this automation
 * cannot handle. For testing purposes, use a test account without 2FA.
 *
 * @param {import('playwright').Page} page
 * @param {{ username: string, password: string, baseUrl: string }} creds
 * @throws {Error} If login fails
 */
async function login(page, { username, password, baseUrl }) {
  // Navigate to Amazon homepage
  await page.goto(baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  // Check if already logged in (from saved session)
  await page.waitForTimeout(2000);
  const alreadyLoggedIn = await page.locator(S.CART_LINK).isVisible().catch(() => false);
  if (alreadyLoggedIn) {
    console.log('Already logged in via saved session');
    return;
  }

  // Click on "Sign in" link
  try {
    await page.locator(S.SIGN_IN_LINK).click({ timeout: config.DEFAULT_TIMEOUT });
  } catch (error) {
    console.log('Sign in link not found, may already be on login page');
  }

  // Fill email and click continue
  try {
    const emailInput = page.locator(S.EMAIL_INPUT);
    await emailInput.waitFor({ state: 'visible', timeout: config.DEFAULT_TIMEOUT });
    await emailInput.fill(username);
    await page.locator(S.CONTINUE_BUTTON).click();
  } catch (error) {
    console.log('Email input not found, may be at password step or already logged in');
  }

  // Fill password and sign in
  try {
    const passwordInput = page.locator(S.PASSWORD_INPUT);
    await passwordInput.waitFor({ state: 'visible', timeout: config.DEFAULT_TIMEOUT });
    await passwordInput.fill(password);
    await page.locator(S.SIGN_IN_BUTTON).click();
  } catch (error) {
    const isLoggedIn = await page.locator(S.CART_LINK).isVisible().catch(() => false);
    if (isLoggedIn) {
      console.log('Already logged in');
      return;
    }
    throw new Error(`Login failed: ${error.message}`);
  }

  // Handle post-login interstitials
  await page.waitForTimeout(3000);

  // "Keep hackers out" / "Add mobile number" → click "Not now"
  try {
    const notNow = page.locator('a:has-text("Not now"), button:has-text("Not now")');
    const notNowVisible = await notNow.isVisible().catch(() => false);
    if (notNowVisible) {
      console.log('Skipping "Keep hackers out" interstitial...');
      await notNow.click();
      await page.waitForTimeout(2000);
    }
  } catch {
    // No interstitial — continue
  }

  // Navigate back to homepage to ensure cart link is visible
  await page.goto(baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForTimeout(2000);

  // Validate login success by checking for cart or account elements
  const isLoggedIn = await page.locator(S.CART_LINK).isVisible().catch(() => false);

  if (!isLoggedIn) {
    const errorVisible = await page.locator(S.LOGIN_ERROR).isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page.locator(S.LOGIN_ERROR).textContent();
      throw new Error(`Login failed: ${errorText}`);
    }
    throw new Error('Login failed: Could not verify successful login');
  }
}

module.exports = { login };