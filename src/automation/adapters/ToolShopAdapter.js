// src/automation/adapters/ToolShopAdapter.js
//
// Concrete adapter for https://practicesoftwaretesting.com
//
// ★ Bridge Pattern: adapter (Abstraction) receives ToolShopFlows (Implementor)
// ★ Session Continuity: _ensureBrowser() + close() lifecycle

const { SiteAdapter } = require('./SiteAdapter');
const { launchBrowser } = require('../browser/browserFactory');
const { createStepLogger } = require('../utils/stepLogger');
const { validateSearchInput, validatePurchaseInput } = require('../utils/inputValidator');
const { takeScreenshot } = require('../utils/screenshot');
const config = require('../config');

// Bridge: default implementor
const { ToolShopFlows } = require('./SiteFlows');

class ToolShopAdapter extends SiteAdapter {
  /**
   * @param {SiteFlows} [flows] — Bridge Implementor
   */
  constructor(flows) {
    super();
    this._flows = flows || new ToolShopFlows({
      baseUrl:  config.TOOLSHOP_BASE_URL,
      apiUrl:   config.TOOLSHOP_API_URL,
      email:    config.TOOLSHOP_EMAIL,
      password: config.TOOLSHOP_PASSWORD,
    });
    this._browser = null;
    this._page = null;
    this._loggedIn = false;
  }

  get name() {
    return 'toolshop';
  }

  isAlive() {
    return this._browser !== null && this._browser.isConnected();
  }

  async close() {
    if (this._browser) {
      try {
        await this._browser.close();
      } catch (_) { /* already closed */ }
      this._browser = null;
      this._page = null;
      this._loggedIn = false;
    }
  }

  async _ensureBrowser(logger) {
    if (this.isAlive() && this._loggedIn) {
      return this._page;
    }

    const launched = await logger.runStep('OpenBrowser', () =>
      launchBrowser()
    );
    this._browser = launched.browser;
    this._page = launched.page;

    // ★ Bridge: delegate login to the Implementor
    await logger.runStep('Login', () =>
      this._flows.login(this._page)
    );
    this._loggedIn = true;

    return this._page;
  }

  async search({ query, filters, requestId, onStep }) {
    validateSearchInput({ query, filters });

    const logger = createStepLogger(requestId, onStep);

    try {
      const page = await this._ensureBrowser(logger);

      // ★ Bridge: delegate search to Implementor
      const products = await logger.runStep('SearchAndScrape', () =>
        this._flows.search(page, { query, filters })
      );

      return products;
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async purchase({ productTitle, shipping, requestId, onStep }) {
    validatePurchaseInput({ productTitle, shipping });

    const logger = createStepLogger(requestId, onStep);
    let lastStep = 'Init';

    try {
      const page = await this._ensureBrowser(logger);
      lastStep = 'Login';

      // ★ Bridge: delegate cart and checkout to Implementor
      const cartResult = await logger.runStep('AddToCart', () =>
        this._flows.addToCart(page, { title: productTitle, requestId })
      );
      lastStep = 'AddToCart';

      const checkoutResult = await logger.runStep('Checkout', () =>
        this._flows.checkout(page, { shipping, requestId })
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
      if (this._page) {
        try {
          errorScreenshotPath = await takeScreenshot(this._page, requestId, 'ERROR');
        } catch (_) { /* ignore */ }
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

module.exports = { ToolShopAdapter };
