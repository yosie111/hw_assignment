// src/automation/core/base-page.js
// Base class for all page objects across platforms

const { createLogger } = require('./logger');

/**
 * Base Page class that all platform-specific pages should extend
 */
class BasePage {
  /**
   * @param {import('playwright').Page} page - Playwright page instance
   * @param {string} pageName - Name of the page for logging
   */
  constructor(page, pageName = 'Page') {
    this.page = page;
    this.pageName = pageName;
    this.logger = createLogger(`${pageName}`);
  }

  /**
   * Navigate to a URL
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   */
  async goto(url, options = {}) {
    this.logger.info(`Navigating to ${url}`);
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
      ...options,
    });
  }

  /**
   * Wait for a selector to be visible
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForSelector(selector, timeout = 10000) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Click an element
   * @param {string} selector - CSS selector
   */
  async click(selector) {
    this.logger.debug(`Clicking ${selector}`);
    await this.page.locator(selector).click();
  }

  /**
   * Fill input field
   * @param {string} selector - CSS selector
   * @param {string} value - Value to fill
   */
  async fill(selector, value) {
    this.logger.debug(`Filling ${selector}`);
    await this.page.locator(selector).fill(value);
  }

  /**
   * Get text content of an element
   * @param {string} selector - CSS selector
   * @returns {Promise<string>}
   */
  async getText(selector) {
    return await this.page.locator(selector).textContent();
  }

  /**
   * Check if element is visible
   * @param {string} selector - CSS selector
   * @returns {Promise<boolean>}
   */
  async isVisible(selector) {
    try {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Take screenshot
   * @param {string} path - Path to save screenshot
   */
  async screenshot(path) {
    this.logger.debug(`Taking screenshot: ${path}`);
    await this.page.screenshot({ path, fullPage: true });
  }
}

module.exports = { BasePage };
