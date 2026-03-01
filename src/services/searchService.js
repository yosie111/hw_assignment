// src/services/searchService.js
//
// Synchronous Search Service — Facade over Adapter + Domain
//
// ★ DI Change: adapter is injected by the caller (route handler),
//   NOT created inside this module. This means:
//   - Unit tests inject FakeAdapter (no Playwright)
//   - Route handler injects real adapter via createAdapter(site)
//   - Service has ZERO knowledge of which site it's talking to
//
// Design Patterns:
//   - DI (Dependency Injection): adapter comes from outside
//   - Facade: hides complexity of automation + domain behind single call
//   - Observer: onStep callback injected into adapter (decoupled status tracking)
//   - Gatekeeper: createProduct validates/freezes each raw product — invalid ones skipped
//   - Oracle: calculateCart enriches each product with tax breakdown for UI display
//
// Flow:
//   executeSearch(adapter, { query, filters })
//     → uuid() → statusStore.create()
//     → adapter.search() → rawProducts[]
//     → for each: createProduct() → calculateCart() → enriched product
//     → statusStore.complete() → return { requestId, products[] }

const { randomUUID } = require('crypto');
const { createProduct } = require('../domain/Product');
const { calculateCart } = require('../domain/CartCalculator');
const statusStore = require('./statusStore');

// Tax rate — single source: config.js (reads from .env)
const { TAX_RATE } = require('../automation/config');

/**
 * Execute search: adapter → Domain Gatekeeper → Oracle enrichment.
 *
 * @param {SiteAdapter} adapter - Injected adapter (SauceDemoAdapter, FakeAdapter, …)
 * @param {Object} params
 * @param {string} [params.query] - search query (empty = all products)
 * @param {Object} [params.filters] - { maxPrice, minPrice, … }
 * @returns {Promise<{ requestId: string, products: Object[] }>}
 * @throws {Error} if adapter crashes (statusStore also marked as failed)
 */
async function executeSearch(adapter, { query, filters } = {}) {
  const requestId = randomUUID();
  statusStore.create(requestId, 'search');

  try {
    // ★ Adapter call — adapter handles browser, login, scraping
    const rawProducts = await adapter.search({
      query: query || '',
      filters: filters || {},
      requestId,
      onStep: (event) => statusStore.updateStep(requestId, event),
    });

    // Domain Gatekeeper — validate + freeze + enrich each product
    const products = [];
    for (const raw of rawProducts) {
      try {
        // Gatekeeper: createProduct validates and freezes
        const product = createProduct(raw);

        // Oracle: calculate tax for this product (for UI display BEFORE purchase)
        const calc = calculateCart([product], { taxRate: TAX_RATE });

        products.push({
          ...product,
          calc: {
            subtotal: calc.subtotal,
            tax: calc.tax,
            total: calc.total,
          },
        });
      } catch (err) {
        // Defensive: skip invalid product, don't crash entire search
        console.warn(`[${requestId}] Skipping invalid product: ${err.message}`);
      }
    }

    statusStore.complete(requestId, { count: products.length });
    return { requestId, products };

  } catch (error) {
    statusStore.fail(requestId, error.message);
    throw error;
  }
}

/**
 * Get status of a search operation.
 * @param {string} requestId
 * @returns {Object|null} status entry
 */
function getStatus(requestId) {
  return statusStore.get(requestId);
}

module.exports = { executeSearch, getStatus };
