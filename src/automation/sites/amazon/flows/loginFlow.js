// src/automation/sites/amazon/flows/loginFlow.js

const S = require('../selectors');
const config = require('../../../config');

/**
 * Amazon login flow: Navigate → Sign In → Fill credentials → Validate success
 * 
 * Note: Amazon may show captcha or 2FA challenges which this automation
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

  // Click on "Sign in" link
  try {
    await page.locator(S.SIGN_IN_LINK).click({ timeout: config.DEFAULT_TIMEOUT });
  } catch (error) {
    // May already be on login page or signed in
    console.log('Sign in link not found, may already be on login page');
  }

  // Fill email and click continue
  try {
    const emailInput = page.locator(S.EMAIL_INPUT);
    await emailInput.waitFor({ state: 'visible', timeout: config.DEFAULT_TIMEOUT });
    await emailInput.fill(username);
    await page.locator(S.CONTINUE_BUTTON).click();
  } catch (error) {
    // May already be past email step
    console.log('Email input not found, may be at password step or already logged in');
  }

  // Fill password and sign in
  try {
    const passwordInput = page.locator(S.PASSWORD_INPUT);
    await passwordInput.waitFor({ state: 'visible', timeout: config.DEFAULT_TIMEOUT });
    await passwordInput.fill(password);
    await page.locator(S.SIGN_IN_BUTTON).click();
  } catch (error) {
    // Check if already logged in
    const isLoggedIn = await page.locator(S.CART_LINK).isVisible().catch(() => false);
    if (isLoggedIn) {
      console.log('Already logged in');
      return;
    }
    throw new Error(`Login failed: ${error.message}`);
  }

  // Wait for navigation after login - check for cart link (indicates successful login)
  await page.waitForTimeout(2000); // Give page time to navigate
  
  // Validate login success by checking for cart or account elements
  const isLoggedIn = await page.locator(S.CART_LINK).isVisible().catch(() => false);
  
  if (!isLoggedIn) {
    // Check for error message
    const errorVisible = await page.locator(S.LOGIN_ERROR).isVisible().catch(() => false);
    if (errorVisible) {
      const errorText = await page.locator(S.LOGIN_ERROR).textContent();
      throw new Error(`Login failed: ${errorText}`);
    }
    throw new Error('Login failed: Could not verify successful login');
  }
}

module.exports = { login };
