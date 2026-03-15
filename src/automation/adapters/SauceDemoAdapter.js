// src/automation/adapters/SauceDemoAdapter.js
//
// Concrete adapter for https://www.saucedemo.com
//
// ★ Bridge Pattern (Chapter 12):
//   Abstraction   = this adapter (orchestration: open → login → search/purchase → close)
//   Implementor   = SiteFlows (injected via constructor — site-specific DOM interactions)
//
//   The adapter defines WHAT happens (the workflow sequence).
//   The SiteFlows defines HOW it happens (which selectors, which URL, which form fields).
//   These vary independently: changing the workflow doesn't affect the flows,
//   and changing the flows doesn't affect the orchestration.
//
// ★ Session Continuity:
//   _ensureBrowser() lazily initializes browser + login ONCE.
//   Browser stays alive between search() and purchase() calls.
//   close() releases the browser.
//
// Does NOT touch: Domain (Product, Order), Services, StatusStore.

const { SiteAdapter } = require('./SiteAdapter');
const { launchBrowser } = require('../browser/browserFactory');
const { createStepLogger } = require('../utils/stepLogger');
const { validateSearchInput, validatePurchaseInput } = require('../utils/inputValidator');
const { takeScreenshot } = require('../utils/screenshot');
const config = require('../config');

// Bridge: default implementor (used when no flows injected)
const { SauceDemoFlows } = require('./SiteFlows');

class SauceDemoAdapter extends SiteAdapter {
  /**
   * @param {SiteFlows} [flows] — Bridge Implementor (injected by Abstract Factory).
   *   If omitted, creates SauceDemoFlows internally (backward compatible).
   */
  constructor(flows) {
    super();
    // ★ Bridge: store the Implementor
    this._flows = flows || new SauceDemoFlows({
      baseUrl:  config.SAUCEDEMO_BASE_URL,
      username: config.SAUCEDEMO_USERNAME,
      password: config.SAUCEDEMO_PASSWORD,
    });
    this._browser = null;
    this._page = null;
    this._loggedIn = false;
  }

  get name() {
    return 'saucedemo';
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

  /**
   * Lazily open browser and login. Reuses existing session if alive.
   * @private
   */
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

      // ★ Bridge: delegate search to the Implementor
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

      // ★ Bridge: navigate to catalog via Implementor
      await this._flows.navigateToCatalog(page);

      lastStep = 'Login';

      // ★ Bridge: delegate cart and checkout to the Implementor
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

module.exports = { SauceDemoAdapter };
