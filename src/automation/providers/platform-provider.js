// src/automation/providers/platform-provider.js
// Base class for all platform providers

const { launchBrowser } = require('../browser/factory');
const { BrowserManager } = require('../browser/manager');

/**
 * PlatformProvider - Base class that all e-commerce platform providers must extend
 * 
 * Each provider implements platform-specific logic for:
 * - search: finding products
 * - purchase: completing an order
 * 
 * Subclasses should override these methods with platform-specific implementations.
 */
class PlatformProvider {
  /**
   * @param {Object} config - Platform-specific configuration
   */
  constructor(config) {
    this.config = config;
    this.browserManager = new BrowserManager();
  }

  /**
   * Launch browser and initialize page
   * @returns {Promise<import('playwright').Page>}
   */
  async launch() {
    const launchResult = await launchBrowser();
    this.browserManager.setInstance(launchResult);
    return this.browserManager.getPage();
  }

  /**
   * Get current page instance
   * @returns {import('playwright').Page}
   */
  getPage() {
    return this.browserManager.getPage();
  }

  /**
   * Get browser manager
   * @returns {BrowserManager}
   */
  getBrowserManager() {
    return this.browserManager;
  }

  /**
   * Close browser and cleanup resources
   */
  async close() {
    await this.browserManager.close();
  }

  /**
   * Search for products on the platform
   * 
   * @param {Object} params
   * @param {string} params.query - Search query text
   * @param {Object} [params.filters] - Optional filters (e.g., { maxPrice: number })
   * @param {string} params.requestId - Unique request identifier
   * @param {Function} [params.onStep] - Progress callback
   * @returns {Promise<Array>} List of products
   * @abstract
   */
  async search({ query, filters, requestId, onStep }) {
    throw new Error('search() must be implemented by subclass');
  }

  /**
   * Purchase a product on the platform
   * 
   * @param {Object} params
   * @param {string} params.productTitle - Product to purchase
   * @param {Object} params.shipping - Shipping information
   * @param {string} params.requestId - Unique request identifier
   * @param {Function} [params.onStep] - Progress callback
   * @returns {Promise<Object>} Order result
   * @abstract
   */
  async purchase({ productTitle, shipping, requestId, onStep }) {
    throw new Error('purchase() must be implemented by subclass');
  }
}

module.exports = { PlatformProvider };
