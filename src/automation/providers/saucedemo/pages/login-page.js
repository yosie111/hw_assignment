// src/automation/providers/saucedemo/pages/login-page.js
// Saucedemo Login Page

const { BasePage } = require('../../../core/base-page');

// Selectors
const SELECTORS = {
  USERNAME: '[data-test="username"]',
  PASSWORD: '[data-test="password"]',
  LOGIN_BUTTON: '[data-test="login-button"]',
  ERROR: '[data-test="error"]',
  INVENTORY_LIST: '[data-test="inventory-list"]',
};

/**
 * Login Page for Saucedemo
 */
class LoginPage extends BasePage {
  constructor(page) {
    super(page, 'LoginPage');
  }

  /**
   * Navigate to login page
   * @param {string} baseUrl - Base URL
   */
  async navigate(baseUrl) {
    await this.goto(baseUrl, { timeout: 30000 });
  }

  /**
   * Perform login
   * @param {string} username - Username
   * @param {string} password - Password
   */
  async login(username, password) {
    this.logger.info(`Logging in as ${username}`);
    
    await this.fill(SELECTORS.USERNAME, username);
    await this.fill(SELECTORS.PASSWORD, password);
    await this.click(SELECTORS.LOGIN_BUTTON);

    // Wait for either success or error
    const errorLocator = this.page.locator(SELECTORS.ERROR);
    const inventoryLocator = this.page.locator(SELECTORS.INVENTORY_LIST);

    const result = await Promise.race([
      inventoryLocator.waitFor({ state: 'visible' }).then(() => 'success'),
      errorLocator.waitFor({ state: 'visible' }).then(() => 'error'),
    ]);

    if (result === 'error') {
      const errorText = await errorLocator.textContent();
      throw new Error(`Login failed: ${errorText}`);
    }

    this.logger.info('Login successful');
  }

  /**
   * Check if login error is displayed
   * @returns {Promise<boolean>}
   */
  async hasError() {
    return await this.isVisible(SELECTORS.ERROR);
  }

  /**
   * Get error message text
   * @returns {Promise<string>}
   */
  async getErrorText() {
    return await this.getText(SELECTORS.ERROR);
  }
}

module.exports = { LoginPage };
