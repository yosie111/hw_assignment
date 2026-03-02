// src/automation/adapters/adapterFactory.js
//
// Adapter Registry + Factory
//
// ★ Adding a new site requires exactly 2 steps:
//   1. Create XxxAdapter.js extending SiteAdapter
//   2. Add one line to `registry` below
//
// No changes needed in Services, Routes, or UI.

const { SauceDemoAdapter } = require('./SauceDemoAdapter');
const { AmazonAdapter } = require('./AmazonAdapter');
const { ToolShopAdapter } = require('./ToolShopAdapter');

/**
 * Registry: site identifier → adapter constructor.
 * Lazy instantiation — new adapter per request (no shared state).
 */
const registry = {
  saucedemo: () => new SauceDemoAdapter(),
  amazon: () => new AmazonAdapter(),
  toolshop: () => new ToolShopAdapter(),
};

/**
 * Create an adapter instance for the given site.
 *
 * @param {string} site - Site identifier ('saucedemo', 'amazon', …)
 * @returns {SiteAdapter} New adapter instance
 * @throws {Error} If site is not registered
 */
function createAdapter(site) {
  const factory = registry[site];
  if (!factory) {
    const available = Object.keys(registry).join(', ');
    throw new Error(`Unknown site: "${site}". Available: ${available}`);
  }
  return factory();
}

/**
 * List all registered site identifiers.
 * Used by validators.js to build the Zod enum dynamically.
 *
 * @returns {string[]}
 */
function getAvailableSites() {
  return Object.keys(registry);
}

module.exports = { createAdapter, getAvailableSites };
