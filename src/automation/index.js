// src/automation/index.js
// ★ Public API — only these two functions are exposed to the Services layer.

const { register, get } = require('./providers/registry');
const { SaucedemoProvider } = require('./providers/saucedemo/saucedemo-provider');
const { AmazonProvider } = require('./providers/amazon/amazon-provider');
const { validateSearchInput, validatePurchaseInput } = require('./utils/inputValidator');

// Auto-register providers on module load
register('saucedemo', SaucedemoProvider);
register('amazon', AmazonProvider);

/**
 * Search flow: validate → get provider → execute search
 *
 * @param {Object} params
 * @param {string} params.query - Search text (empty string for all products)
 * @param {Object} [params.filters] - { maxPrice?: number }
 * @param {string} params.requestId - Unique request identifier
 * @param {Function} [params.onStep] - Callback: ({ requestId, step, status, durationMs, error? }) => void
 * @param {string} [params.platform='saucedemo'] - Platform name (saucedemo, amazon, etc.)
 * @returns {Promise<Product[]>}
 */
async function search({ query, filters, requestId, onStep, platform = 'saucedemo' }) {
  validateSearchInput({ query, filters });

  // Get provider from registry
  const ProviderClass = get(platform);
  const provider = new ProviderClass();

  // Execute search via provider
  return await provider.search({ query, filters, requestId, onStep });
}

/**
 * Purchase flow: validate → get provider → execute purchase
 *
 * @param {Object} params
 * @param {string} params.productTitle - Product name to find and purchase
 * @param {Object} params.shipping - { firstName, lastName, postalCode }
 * @param {string} params.requestId - Unique request identifier
 * @param {Function} [params.onStep] - Status callback
 * @param {string} [params.platform='saucedemo'] - Platform name (saucedemo, amazon, etc.)
 * @returns {Promise<OrderResult>}
 */
async function purchase({ productTitle, shipping, requestId, onStep, platform = 'saucedemo' }) {
  validatePurchaseInput({ productTitle, shipping });

  // Get provider from registry
  const ProviderClass = get(platform);
  const provider = new ProviderClass();

  // Execute purchase via provider
  return await provider.purchase({ productTitle, shipping, requestId, onStep });
}

module.exports = { search, purchase };
