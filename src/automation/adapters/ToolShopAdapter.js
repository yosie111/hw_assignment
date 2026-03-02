// src/automation/adapters/ToolShopAdapter.js
//
// Concrete adapter for https://practicesoftwaretesting.com
//
// Responsibilities:
//   1. Browser lifecycle (open → close in finally)
//   2. Login with ToolShop credentials
//   3. Delegate to site-specific flows (loginFlow, searchFlow, cartFlow, checkoutFlow)
//   4. Step logging via createStepLogger
//   5. Error screenshots on purchase failure
//
// Does NOT touch: Domain (Product, Order), Services, StatusStore.
// Those live in higher layers — adapter is pure automation.

const { SiteAdapter } = require('./SiteAdapter');
const { launchBrowser } = require('../browser/browserFactory');
const { createStepLogger } = require('../utils/stepLogger');
const { validateSearchInput, validatePurchaseInput } = require('../utils/inputValidator');
const { takeScreenshot } = require('../utils/screenshot');
const config = require('../config');

// Site-specific flows
const { login } = require('../sites/toolshop/flows/loginFlow');
const { searchProducts } = require('../sites/toolshop/flows/searchFlow');
const { addToCart } = require('../sites/toolshop/flows/cartFlow');
const { checkout } = require('../sites/toolshop/flows/checkoutFlow');

class ToolShopAdapter extends SiteAdapter {
  get name() {
    return 'toolshop';
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
        launchBrowser()
      );
      browser = launched.browser;
      const page = launched.page;

      await logger.runStep('Login', () =>
        login(page, {
          email: config.TOOLSHOP_EMAIL,
          password: config.TOOLSHOP_PASSWORD,
          baseUrl: config.TOOLSHOP_BASE_URL,
        })
      );

      const products = await logger.runStep('SearchAndScrape', () =>
        searchProducts(page, {
          query,
          filters,
          baseUrl: config.TOOLSHOP_BASE_URL,
        })
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
        launchBrowser()
      );
      browser = launched.browser;
      page = launched.page;

      await logger.runStep('Login', () =>
        login(page, {
          email: config.TOOLSHOP_EMAIL,
          password: config.TOOLSHOP_PASSWORD,
          baseUrl: config.TOOLSHOP_BASE_URL,
        })
      );
      lastStep = 'Login';

      const cartResult = await logger.runStep('AddToCart', () =>
        addToCart(page, {
          title: productTitle,
          requestId,
          baseUrl: config.TOOLSHOP_BASE_URL,
        })
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
      // ★ Error screenshot — capture browser state at failure point
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

module.exports = { ToolShopAdapter };
