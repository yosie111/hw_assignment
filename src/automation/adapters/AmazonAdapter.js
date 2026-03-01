// src/automation/adapters/AmazonAdapter.js
//
// Concrete adapter for https://www.amazon.com
//
// Same structure as SauceDemoAdapter but uses:
//   - Amazon-specific flows (loginFlow, searchFlow, cartFlow, checkoutFlow)
//   - Amazon credentials from config
//   - useAmazonSession: true for saved session cookies (stealth)

const { SiteAdapter } = require('./SiteAdapter');
const { launchBrowser } = require('../browser/browserFactory');
const { createStepLogger } = require('../utils/stepLogger');
const { validateSearchInput, validatePurchaseInput } = require('../utils/inputValidator');
const { takeScreenshot } = require('../utils/screenshot');
const config = require('../config');

// Amazon-specific flows (unchanged)
const { login } = require('../sites/amazon/flows/loginFlow');
const { searchProducts } = require('../sites/amazon/flows/searchFlow');
const { addToCart } = require('../sites/amazon/flows/cartFlow');
const { checkout } = require('../sites/amazon/flows/checkoutFlow');

class AmazonAdapter extends SiteAdapter {
  get name() {
    return 'amazon';
  }

  /**
   * @param {Object} params - { query, filters, requestId, onStep }
   * @returns {Promise<NormalizedProduct[]>}
   */
  async search({ query, filters, requestId, onStep }) {
    validateSearchInput({ query, filters });

    const logger = createStepLogger(requestId, onStep);
    let browser;

    try {
      const launched = await logger.runStep('OpenBrowser', () =>
        launchBrowser({ useAmazonSession: true })
      );
      browser = launched.browser;
      const page = launched.page;

      await logger.runStep('Login', () =>
        login(page, {
          username: config.AMAZON_USERNAME,
          password: config.AMAZON_PASSWORD,
          baseUrl: config.AMAZON_BASE_URL,
        })
      );

      const products = await logger.runStep('SearchAndScrape', () =>
        searchProducts(page, { query, filters })
      );

      return products;
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * @param {Object} params - { productTitle, shipping, requestId, onStep }
   * @returns {Promise<PurchaseResult>}
   */
  async purchase({ productTitle, shipping, requestId, onStep }) {
    validatePurchaseInput({ productTitle, shipping });

    const logger = createStepLogger(requestId, onStep);
    let browser;
    let page;
    let lastStep = 'Init';

    try {
      const launched = await logger.runStep('OpenBrowser', () =>
        launchBrowser({ useAmazonSession: true })
      );
      browser = launched.browser;
      page = launched.page;

      await logger.runStep('Login', () =>
        login(page, {
          username: config.AMAZON_USERNAME,
          password: config.AMAZON_PASSWORD,
          baseUrl: config.AMAZON_BASE_URL,
        })
      );
      lastStep = 'Login';

      const cartResult = await logger.runStep('AddToCart', () =>
        addToCart(page, { title: productTitle, requestId })
      );
      lastStep = 'AddToCart';

      const checkoutResult = await logger.runStep('Checkout', () =>
        checkout(page, { shipping, requestId })
      );
      lastStep = 'Checkout';

      return {
        ...checkoutResult,
        cartScreenshots: cartResult.screenshots,
        lastStep,
        requestId,
        steps: logger.getSteps(),
      };
    } catch (error) {
      let errorScreenshotPath = null;
      if (page) {
        try {
          errorScreenshotPath = await takeScreenshot(page, requestId, 'ERROR');
        } catch (_) {
          /* ignore screenshot failure */
        }
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
      if (browser) await browser.close();
    }
  }
}

module.exports = { AmazonAdapter };
