// src/automation/core/platform-provider.js
// Base class/interface for platform providers

const { BrowserManager } = require('./browser-manager');
const { createLogger } = require('./logger');

/**
 * Base Platform Provider class
 * All platform-specific providers should extend this class
 */
class PlatformProvider {
  /**
   * @param {string} platformName - Name of the platform
   * @param {Object} config - Platform configuration
   */
  constructor(platformName, config = {}) {
    this.platformName = platformName;
    this.config = config;
    this.browserManager = new BrowserManager(config.browser || {});
    this.logger = createLogger(platformName);
  }

  /**
   * Initialize the platform (launch browser, setup)
   * Must be implemented by subclasses
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('Initializing platform');
    await this.browserManager.launch();
  }

  /**
   * Cleanup resources (close browser, etc.)
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.logger.info('Cleaning up platform');
    await this.browserManager.close();
  }

  /**
   * Get the current page
   * @returns {import('playwright').Page}
   */
  getPage() {
    return this.browserManager.getPage();
  }

  /**
   * Perform login
   * Must be implemented by subclasses
   * @param {Object} credentials - Login credentials
   * @returns {Promise<void>}
   */
  async login(credentials) {
    throw new Error(`login() must be implemented by ${this.platformName}`);
  }

  /**
   * Search for products
   * Must be implemented by subclasses
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>}
   */
  async search(params) {
    throw new Error(`search() must be implemented by ${this.platformName}`);
  }

  /**
   * Complete a purchase
   * Must be implemented by subclasses
   * @param {Object} params - Purchase parameters
   * @returns {Promise<Object>}
   */
  async purchase(params) {
    throw new Error(`purchase() must be implemented by ${this.platformName}`);
  }

  /**
   * Get platform configuration
   * @returns {Object}
   */
  getConfig() {
    return this.config;
  }
}

module.exports = { PlatformProvider };
