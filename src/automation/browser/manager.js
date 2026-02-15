// src/automation/browser/manager.js
// Browser lifecycle management

/**
 * BrowserManager - Manages browser instances with proper lifecycle handling
 */
class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Check if browser is currently active
   * @returns {boolean}
   */
  isActive() {
    return this.browser !== null && this.browser.isConnected();
  }

  /**
   * Store browser launch result
   * @param {Object} launchResult - Result from factory.launchBrowser()
   * @param {import('playwright').Browser} launchResult.browser
   * @param {import('playwright').BrowserContext} launchResult.context
   * @param {import('playwright').Page} launchResult.page
   */
  setInstance({ browser, context, page }) {
    this.browser = browser;
    this.context = context;
    this.page = page;
  }

  /**
   * Get current page
   * @returns {import('playwright').Page}
   */
  getPage() {
    return this.page;
  }

  /**
   * Get current browser
   * @returns {import('playwright').Browser}
   */
  getBrowser() {
    return this.browser;
  }

  /**
   * Close browser and cleanup
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}

module.exports = { BrowserManager };
