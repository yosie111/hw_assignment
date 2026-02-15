// src/automation/core/browser-manager.js
// Shared browser management for all platforms

const { chromium, firefox } = require('playwright');
const { createLogger } = require('./logger');

const logger = createLogger('BrowserManager');

/**
 * Browser Manager - handles browser lifecycle
 */
class BrowserManager {
  constructor(config = {}) {
    this.config = {
      headless: config.headless !== false,
      defaultTimeout: config.defaultTimeout || 10000,
      navigationTimeout: config.navigationTimeout || 35000,
      viewport: config.viewport || { width: 1280, height: 720 },
      browserType: config.browserType || 'chromium',
    };
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Launch browser and create a new page
   * @returns {Promise<{ browser, context, page }>}
   */
  async launch() {
    logger.info(`Launching ${this.config.browserType} browser (headless: ${this.config.headless})`);

    const browserLib = this.config.browserType === 'firefox' ? firefox : chromium;
    
    this.browser = await browserLib.launch({
      headless: this.config.headless,
    });

    this.context = await this.browser.newContext({
      viewport: this.config.viewport,
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.defaultTimeout);
    this.page.setDefaultNavigationTimeout(this.config.navigationTimeout);

    logger.info('Browser launched successfully');

    return {
      browser: this.browser,
      context: this.context,
      page: this.page,
    };
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      logger.info('Closing browser');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  /**
   * Get current page
   * @returns {import('playwright').Page}
   */
  getPage() {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.page;
  }
}

module.exports = { BrowserManager };
