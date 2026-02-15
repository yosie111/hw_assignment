// src/automation/providers/saucedemo/saucedemo-provider.js
// Saucedemo Platform Provider

const { PlatformProvider } = require('../../core/platform-provider');
const { LoginPage } = require('./pages/login-page');
const { InventoryPage } = require('./pages/inventory-page');
const { executePurchaseFlow } = require('./flows/purchase-flow');
const config = require('./config');

/**
 * Saucedemo Platform Provider
 * Implements the platform-specific automation for Saucedemo
 */
class SaucedemoProvider extends PlatformProvider {
  constructor(customConfig = {}) {
    // Merge custom config with default config
    const mergedConfig = {
      ...config,
      ...customConfig,
      browser: {
        ...config.browser,
        ...(customConfig.browser || {}),
      },
    };

    super('Saucedemo', mergedConfig);
  }

  /**
   * Perform login to Saucedemo
   * @param {Object} credentials - { username, password } (optional, uses config if not provided)
   * @returns {Promise<void>}
   */
  async login(credentials = {}) {
    const username = credentials.username || this.config.username;
    const password = credentials.password || this.config.password;
    const baseUrl = this.config.baseUrl;

    this.logger.info('Logging in to Saucedemo');

    const page = this.getPage();
    const loginPage = new LoginPage(page);

    await loginPage.navigate(baseUrl);
    await loginPage.login(username, password);

    this.logger.info('Login successful');
  }

  /**
   * Search for products on Saucedemo
   * @param {Object} params - { query, filters: { maxPrice } }
   * @returns {Promise<Array>}
   */
  async search(params = {}) {
    const { query = '', filters = {} } = params;

    this.logger.info('Searching for products');

    const page = this.getPage();
    const inventoryPage = new InventoryPage(page);

    await inventoryPage.waitForLoad();
    await inventoryPage.sortBy('lohi'); // Sort by price: low to high

    let products = await inventoryPage.getAllProducts();

    // Client-side filtering
    if (query && query.trim()) {
      const q = query.toLowerCase();
      products = products.filter(p => p.title.toLowerCase().includes(q));
    }

    if (filters.maxPrice != null) {
      products = products.filter(p => p.price <= filters.maxPrice);
    }

    this.logger.info(`Found ${products.length} products`);
    return products;
  }

  /**
   * Complete a purchase on Saucedemo
   * @param {Object} params - { productTitle, shipping, requestId }
   * @returns {Promise<Object>}
   */
  async purchase(params) {
    const { productTitle, shipping, requestId = 'run' } = params;

    this.logger.info(`Purchasing product: ${productTitle}`);

    const page = this.getPage();

    const result = await executePurchaseFlow(page, {
      productTitle,
      shipping,
      username: this.config.username,
      password: this.config.password,
      baseUrl: this.config.baseUrl,
      requestId,
    });

    this.logger.info('Purchase completed successfully');
    return result;
  }

  /**
   * Execute search flow (login + search)
   * @param {Object} params - { query, filters, requestId }
   * @returns {Promise<Array>}
   */
  async executeSearchFlow(params) {
    const { query = '', filters = {}, requestId = 'search' } = params;

    try {
      await this.initialize();
      await this.login();
      const products = await this.search({ query, filters });
      return products;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Execute purchase flow (full flow from browser launch to completion)
   * @param {Object} params - { productTitle, shipping, requestId }
   * @returns {Promise<Object>}
   */
  async executePurchaseFlow(params) {
    try {
      await this.initialize();
      const result = await this.purchase(params);
      return result;
    } finally {
      await this.cleanup();
    }
  }
}

module.exports = { SaucedemoProvider };
