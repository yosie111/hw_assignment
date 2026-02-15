// src/automation/providers/saucedemo/pages/login-page.js

const { SELECTORS } = require('../config');

/**
 * LoginPage - Page Object for Saucedemo login
 */
class LoginPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigate to login page
   * @param {string} url - Base URL
   */
  async goto(url) {
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  }

  /**
   * Fill username field
   * @param {string} username
   */
  async fillUsername(username) {
    await this.page.locator(SELECTORS.LOGIN_USERNAME).fill(username);
  }

  /**
   * Fill password field
   * @param {string} password
   */
  async fillPassword(password) {
    await this.page.locator(SELECTORS.LOGIN_PASSWORD).fill(password);
  }

  /**
   * Click login button
   */
  async clickLogin() {
    await this.page.locator(SELECTORS.LOGIN_BUTTON).click();
  }

  /**
   * Wait for login to complete - either success (inventory) or error
   * @returns {Promise<'success'|'error'>}
   */
  async waitForResult() {
    const errorLocator = this.page.locator(SELECTORS.LOGIN_ERROR);
    const inventoryLocator = this.page.locator(SELECTORS.INVENTORY_LIST);

    const result = await Promise.race([
      inventoryLocator.waitFor({ state: 'visible' }).then(() => 'success'),
      errorLocator.waitFor({ state: 'visible' }).then(() => 'error'),
    ]);

    return result;
  }

  /**
   * Get error message if login failed
   * @returns {Promise<string>}
   */
  async getErrorMessage() {
    return await this.page.locator(SELECTORS.LOGIN_ERROR).textContent();
  }
}

module.exports = { LoginPage };
