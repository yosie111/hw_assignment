// src/automation/adapters/SiteFlows.js
//
// Bridge Pattern — Implementor interface.
//
// Chapter 12 mapping:
//   Abstraction    = SiteAdapter (orchestrates workflow: open → login → search/purchase → close)
//   Implementor    = SiteFlows (this class — the interface for site-specific flow logic)
//   ConcreteImpA   = SauceDemoFlows (saucedemo-specific DOM interactions)
//   ConcreteImpB   = ToolShopFlows  (toolshop-specific DOM interactions)
//
// Why Bridge here:
//   SiteAdapter defines WHAT happens (open browser → login → search → close).
//   SiteFlows defines HOW it happens (which selectors, which URL, which form fields).
//
//   Without the Bridge, each adapter hardcodes imports to its site's flows.
//   With the Bridge, the adapter receives a SiteFlows object via the constructor.
//   This means:
//     - The adapter's orchestration logic can be reused across sites
//     - A new site only needs a new SiteFlows implementation (no new adapter class)
//     - Tests can inject mock flows without touching Playwright

/**
 * SiteFlows — Implementor interface for site-specific browser interactions.
 *
 * Each method receives a Playwright page and site-specific params,
 * and performs the actual DOM manipulation for that step.
 *
 * @abstract
 */
class SiteFlows {
  /**
   * @param {Object} siteConfig — credentials, URLs, etc. from Abstract Factory
   */
  constructor(siteConfig = {}) {
    if (new.target === SiteFlows) {
      throw new Error('SiteFlows is abstract — use a concrete implementation');
    }
    this._config = siteConfig;
  }

  /** Site name for logging */
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
   * Add a product to the cart.
   * @param {import('playwright').Page} page
   * @param {{ title: string, requestId: string }} params
   * @returns {Promise<{ itemCount: number, screenshots: string[] }>}
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

  async login(page) {
    const { login } = require('../sites/toolshop/flows/loginFlow');
    await login(page, {
      email:    this._config.email,
      password: this._config.password,
      baseUrl:  this._config.baseUrl,
      apiUrl:   this._config.apiUrl,
    });
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
