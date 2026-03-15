// src/services/ShoppingFacade.js
//
// Facade Pattern — simplified interface over the complex subsystem.
//
// ★ Layer separation (DI):
//   The Facade receives getFactory via constructor injection.
//   It never imports from the automation layer directly.
//   The API layer (routes) creates the Facade with the concrete factory.
//
//   API: new ShoppingFacade(getFactory) → Facade → service({ taxRate }) → CartCalculator
//
//   Each site defines its own tax rate via its factory:
//     Saucedemo → 8%  (site charges 8% sales tax)
//     ToolShop  → 0%  (site calculates tax server-side)
//     Amazon    → 0%  (tax varies by state, site handles it)

const { executeSearch } = require('./searchService');
const { executePurchase } = require('./purchaseService');
const sessionStore = require('./sessionStore');

class ShoppingFacade {
  /**
   * @param {Function} getFactory - Injected factory resolver: (site) => SiteAbstractFactory
   *   Provided by the API layer from automation/adapters/abstractFactory.
   *   This keeps the service layer decoupled from automation internals.
   */
  constructor(getFactory) {
    if (typeof getFactory !== 'function') {
      throw new Error('ShoppingFacade requires a getFactory function');
    }
    this._getFactory = getFactory;
  }

  /**
   * Search for products on a site.
   *
   * @param {string} site
   * @param {{ query?: string, filters?: Object }} params
   * @returns {Promise<{ requestId, products, recommendedId, sessionId, taxRate }>}
   */
  async search(site, { query, filters } = {}) {
    const factory = this._getFactory(site);
    const adapter = factory.createAdapter();
    const taxRate = factory.getTaxRate();

    const result = await executeSearch(adapter, { query, filters, taxRate });
    const sessionId = sessionStore.store(adapter);

    return {
      requestId: result.requestId,
      products: result.products,
      recommendedId: result.recommendedId,
      sessionId,
      taxRate,
    };
  }

  /**
   * Purchase a product.
   *
   * @param {{ site: string, sessionId?: string, product: Object, shipping: Object }} params
   * @returns {Promise<{ requestId }>}
   */
  async purchase({ site, sessionId, product, shipping }) {
    const factory = this._getFactory(site);
    const taxRate = factory.getTaxRate();

    let adapter = sessionStore.consume(sessionId);

    if (!adapter || !adapter.isAlive || !adapter.isAlive()) {
      adapter = factory.createAdapter();
    }

    return executePurchase(adapter, { product, shipping, taxRate });
  }
}

module.exports = { ShoppingFacade };
