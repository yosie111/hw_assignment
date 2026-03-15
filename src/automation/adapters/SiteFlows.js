// src/automation/adapters/SiteFlows.js
//
// Bridge Pattern — Implementor hierarchy.
//
// SiteFlows defines what each site must do (login, search, addToCart, checkout).
// Concrete implementations (SauceDemoFlows, ToolShopFlows) know HOW to do it.
// SiteAdapter (Abstraction) delegates to SiteFlows (Implementor).
//
// ★ IMPROVEMENT (v2):
//   - ToolShopFlows.login now exposes registerAccount as a visible step
//     so it appears in statusStore / UI progress trace.

// ─── Abstract Implementor ───

class SiteFlows {
  /**
   * @param {Object} config - Site-specific configuration
   * @throws {Error} If instantiated directly (abstract class guard)
   */
  constructor(config = {}) {
    if (new.target === SiteFlows) {
      throw new Error('SiteFlows is abstract — use a concrete subclass');
    }
    this._config = config;
  }

  /** @returns {string} Site identifier */
  get siteName() {
    throw new Error('SiteFlows.siteName must be implemented');
  }

  /**
   * Login to the site.
   * @param {import('playwright').Page} page
   * @returns {Promise<void>}
   */
  async login(page) {
    throw new Error(`${this.siteName}: login() not implemented`);
  }

  /**
   * Search for products.
   * @param {import('playwright').Page} page
   * @param {{ query: string, filters: Object }} params
   * @returns {Promise<NormalizedProduct[]>}
   */
  async search(page, params) {
    throw new Error(`${this.siteName}: search() not implemented`);
  }

  /**
   * Add a product to cart.
   * @param {import('playwright').Page} page
   * @param {{ title: string, requestId: string }} params
   * @returns {Promise<CartResult>}
   */
  async addToCart(page, params) {
    throw new Error(`${this.siteName}: addToCart() not implemented`);
  }

  /**
   * Complete checkout.
   * @param {import('playwright').Page} page
   * @param {{ shipping: Object, requestId: string }} params
   * @returns {Promise<PurchaseResult>}
   */
  async checkout(page, params) {
    throw new Error(`${this.siteName}: checkout() not implemented`);
  }

  /**
   * Navigate to the catalog/inventory page.
   * Called when reusing a session that may have left the page elsewhere.
   * @param {import('playwright').Page} page
   * @returns {Promise<void>}
   */
  async navigateToCatalog(page) {
    // Default: no-op (subclasses override if needed)
  }
}

// ─── Concrete Implementor: Saucedemo ───

class SauceDemoFlows extends SiteFlows {
  get siteName() {
    return 'saucedemo';
  }

  async login(page) {
    const { login } = require('../sites/saucedemo/flows/loginFlow');
    await login(page, {
      username: this._config.username,
      password: this._config.password,
      baseUrl:  this._config.baseUrl,
    });
  }

  async search(page, { query, filters }) {
    const { searchProducts } = require('../sites/saucedemo/flows/searchFlow');
    return searchProducts(page, { query, filters });
  }

  async addToCart(page, { title, requestId }) {
    const { addToCart } = require('../sites/saucedemo/flows/cartFlow');
    return addToCart(page, { title, requestId });
  }

  async checkout(page, { shipping, requestId }) {
    const { checkout } = require('../sites/saucedemo/flows/checkoutFlow');
    return checkout(page, { shipping, requestId });
  }

  async navigateToCatalog(page) {
    const url = page.url();
    if (!url.includes('/inventory.html')) {
      await page.goto(this._config.baseUrl + '/inventory.html', {
        waitUntil: 'domcontentloaded',
      });
    }
  }
}

// ─── Concrete Implementor: ToolShop ───

class ToolShopFlows extends SiteFlows {
  get siteName() {
    return 'toolshop';
  }

  /**
   * Login to ToolShop.
   *
   * ★ This method now supports an optional stepLogger parameter.
   *    When provided (by the adapter), the Register step becomes visible
   *    in the status API and UI progress trace.
   *
   *    If stepLogger is NOT provided (backward compatible), login works
   *    as before — registerAccount is called internally by loginFlow.
   *
   * @param {import('playwright').Page} page
   * @param {Object} [options]
   * @param {Object} [options.stepLogger] - Optional stepLogger for progress tracking
   */
  async login(page, options = {}) {
    const { login } = require('../sites/toolshop/flows/loginFlow');
    const { registerAccount } = require('../sites/toolshop/flows/registerFlow');
    const { stepLogger } = options;

    const creds = {
      email:    this._config.email,
      password: this._config.password,
      baseUrl:  this._config.baseUrl,
      apiUrl:   this._config.apiUrl,
    };

    if (stepLogger && creds.apiUrl) {
      // ★ Register as a visible step in status/UI
      await stepLogger.runStep('Register', async () => {
        const result = await registerAccount({
          email: creds.email,
          password: creds.password,
          apiUrl: creds.apiUrl,
        });
        if (!result.success) {
          console.warn(
            `[ToolShopFlows] ⚠ Registration failed (${result.error}). ` +
            `Attempting login anyway.`
          );
        }
        return result;
      });

      // Login WITHOUT auto-register (we already did it above)
      await login(page, { ...creds, apiUrl: undefined });
    } else {
      // Backward compatible: loginFlow handles registration internally
      await login(page, creds);
    }
  }

  async search(page, { query, filters }) {
    const { searchProducts } = require('../sites/toolshop/flows/searchFlow');
    return searchProducts(page, { query, filters, baseUrl: this._config.baseUrl });
  }

  async addToCart(page, { title, requestId }) {
    const { addToCart } = require('../sites/toolshop/flows/cartFlow');
    return addToCart(page, { title, requestId, baseUrl: this._config.baseUrl });
  }

  async checkout(page, { shipping, requestId }) {
    const { checkout } = require('../sites/toolshop/flows/checkoutFlow');
    return checkout(page, { shipping, requestId });
  }
}

module.exports = {
  SiteFlows,
  SauceDemoFlows,
  ToolShopFlows,
};
