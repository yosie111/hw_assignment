// src/services/searchService.js
//
// Synchronous Search Service — Facade over Automation + Domain
//
// Design Patterns:
//   - Facade: hides complexity of automation + domain behind single call
//   - Observer: onStep callback injected into automation (decoupled status tracking)
//   - Gatekeeper: createProduct validates/freezes each raw product — invalid ones skipped
//   - Oracle: calculateCart enriches each product with tax breakdown for UI display
//
// Flow:
//   executeSearch({ query, filters })
//     → uuid() → statusStore.create()
//     → automation.search() → rawProducts[]
//     → for each: createProduct() → calculateCart() → enriched product
//     → statusStore.complete() → return { requestId, products[] }

const { randomUUID } = require('crypto');
const { search } = require('../automation');
const { createProduct } = require('../domain/Product');
const { calculateCart } = require('../domain/CartCalculator');
const statusStore = require('./statusStore');

// Tax rate — single source: config.js (reads from .env)
const { TAX_RATE } = require('../automation/config');

/**
 * Execute search: automation → Domain Gatekeeper → Oracle enrichment.
 *
 * @param {Object} params
 * @param {string} [params.query] - search query (empty = all products)
 * @param {Object} [params.filters] - { maxPrice, minPrice, ... }
 * @returns {Promise<{ requestId: string, products: Object[] }>}
 * @throws {Error} if automation crashes (statusStore also marked as failed)
 */
async function executeSearch({ query, filters } = {}) {
  const requestId = randomUUID();
  statusStore.create(requestId, 'search');

  try {
    // Automation call — returns raw product objects from DOM scraping
    const rawProducts = await search({
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
