// src/services/ShoppingFacade.js
//
// Facade Pattern — simplified interface over the complex subsystem.
//
// ★ Layer separation fix:
//   Before: services imported TAX_RATE from automation/config.js (layer violation).
//   After:  Facade gets taxRate from AbstractFactory.getTaxRate() and passes
//           it as a parameter to services. Services never import site config.
//
//   AbstractFactory.getTaxRate() → Facade → service({ taxRate }) → CartCalculator
//
//   Each site defines its own tax rate:
//     Saucedemo → 8%  (site charges 8% sales tax)
//     ToolShop  → 0%  (site calculates tax server-side)
//     Amazon    → 0%  (tax varies by state, site handles it)

const { executeSearch } = require('./searchService');
const { executePurchase } = require('./purchaseService');
const sessionStore = require('./sessionStore');
const { getFactory } = require('../automation/adapters/abstractFactory');

class ShoppingFacade {
  /**
   * Search for products on a site.
   *
   * @param {string} site
   * @param {{ query?: string, filters?: Object }} params
   * @returns {Promise<{ requestId, products, recommendedId, sessionId, taxRate }>}
   */
  async search(site, { query, filters } = {}) {
    const factory = getFactory(site);
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
    const factory = getFactory(site);
    const taxRate = factory.getTaxRate();

    let adapter = sessionStore.consume(sessionId);

    if (!adapter || !adapter.isAlive || !adapter.isAlive()) {
      adapter = factory.createAdapter();
    }

    return executePurchase(adapter, { product, shipping, taxRate });
  }
}

module.exports = { ShoppingFacade };
