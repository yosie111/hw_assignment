// src/automation/adapters/SauceDemoAdapter.js
//
// Concrete adapter for https://www.saucedemo.com
//
// Responsibilities:
//   1. Browser lifecycle (open → close in finally)
//   2. Login with saucedemo credentials
//   3. Delegate to existing flows (loginFlow, searchFlow, cartFlow, checkoutFlow)
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

// Site-specific flows (unchanged)
const { login } = require('../sites/saucedemo/flows/loginFlow');
const { searchProducts } = require('../sites/saucedemo/flows/searchFlow');
const { addToCart } = require('../sites/saucedemo/flows/cartFlow');
const { checkout } = require('../sites/saucedemo/flows/checkoutFlow');

class SauceDemoAdapter extends SiteAdapter {
  get name() {
    return 'saucedemo';
  }

  /**
   * @param {Object} params - { query, filters, requestId, onStep }
   * @returns {Promise<NormalizedProduct[]>}
   */
  async search({ query, filters, requestId, onStep }) {
    // Defense in depth — fail fast before opening browser
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
          username: config.SAUCEDEMO_USERNAME,
          password: config.SAUCEDEMO_PASSWORD,
          baseUrl: config.SAUCEDEMO_BASE_URL,
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
    // Defense in depth
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
          username: config.SAUCEDEMO_USERNAME,
          password: config.SAUCEDEMO_PASSWORD,
          baseUrl: config.SAUCEDEMO_BASE_URL,
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

module.exports = { SauceDemoAdapter };
