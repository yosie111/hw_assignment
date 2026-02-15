// src/automation/providers/saucedemo/saucedemo-provider.js

const { PlatformProvider } = require('../platform-provider');
const { login } = require('./flows/login-flow');
const { searchProducts } = require('./flows/search-flow');
const { purchase: purchaseFlow } = require('./flows/purchase-flow');
const { createStepLogger } = require('../../utils/stepLogger');
const { takeScreenshot } = require('../../utils/screenshot');
const saucedemoConfig = require('./config');

/**
 * SaucedemoProvider - Implementation of PlatformProvider for Saucedemo
 */
class SaucedemoProvider extends PlatformProvider {
  constructor(config = {}) {
    // Merge with default Saucedemo config
    super({
      ...saucedemoConfig,
      ...config,
    });
  }

  /**
   * Search for products on Saucedemo
   * 
   * @param {Object} params
   * @param {string} params.query - Search query
   * @param {Object} [params.filters] - { maxPrice?: number }
   * @param {string} params.requestId - Request identifier
   * @param {Function} [params.onStep] - Progress callback
   * @returns {Promise<Array>} List of products
   */
  async search({ query, filters, requestId, onStep }) {
    const logger = createStepLogger(requestId, onStep);

    try {
      const page = await logger.runStep('OpenBrowser', () => this.launch());

      await logger.runStep('Login', () =>
        login(page, {
          username: this.config.USERNAME,
          password: this.config.PASSWORD,
          baseUrl: this.config.BASE_URL,
        })
      );

      const products = await logger.runStep('SearchAndScrape', () =>
        searchProducts(page, { query, filters })
      );

      return products;

    } catch (error) {
      throw error;
    } finally {
      await this.close();
    }
  }

  /**
   * Purchase a product on Saucedemo
   * 
   * @param {Object} params
   * @param {string} params.productTitle - Product to purchase
   * @param {Object} params.shipping - Shipping information
   * @param {string} params.requestId - Request identifier
   * @param {Function} [params.onStep] - Progress callback
   * @returns {Promise<Object>} Order result
   */
  async purchase({ productTitle, shipping, requestId, onStep }) {
    const logger = createStepLogger(requestId, onStep);
    let page;
    let lastStep = 'Init';

    try {
      page = await logger.runStep('OpenBrowser', () => this.launch());

      await logger.runStep('Login', () =>
        login(page, {
          username: this.config.USERNAME,
          password: this.config.PASSWORD,
          baseUrl: this.config.BASE_URL,
        })
      );
      lastStep = 'Login';

      const result = await logger.runStep('Purchase', () =>
        purchaseFlow(page, { productTitle, shipping, requestId })
      );
      lastStep = 'Purchase';

      return {
        ...result,
        lastStep,
        requestId,
        steps: logger.getSteps(),
      };

    } catch (error) {
      // Error screenshot
      let errorScreenshotPath = null;
      if (page) {
        try {
          errorScreenshotPath = await takeScreenshot(page, requestId, 'ERROR');
        } catch (_) { /* ignore screenshot failure */ }
      }

      return {
        status: 'failed',
        lastStep,
        requestId,
        error: error.message,
        screenshotPath: errorScreenshotPath,
        steps: logger.getSteps(),
      };
    } finally {
      await this.close();
    }
  }
}

module.exports = { SaucedemoProvider };
