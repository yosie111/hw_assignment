// src/automation/adapters/adapterFactory.js
//
// Adapter Registry + Factory — now backed by Abstract Factory.
//
// ★ This module is the public API that routes and tests import.
//   Internally it delegates to abstractFactory.js (Abstract Factory pattern).
//
// Usage unchanged:
//   const adapter = createAdapter('saucedemo');
//   const sites = getAvailableSites();
//
// To access the full Abstract Factory (flows, config):
//   const { getFactory } = require('./abstractFactory');
//   const factory = getFactory('saucedemo');
//   const flows = factory.createFlows();

const { getFactory, getAvailableSites } = require('./abstractFactory');

/**
 * Create an adapter instance for the given site.
 * Delegates to the Abstract Factory for the site.
 *
 * @param {string} site - Site identifier ('saucedemo', 'toolshop', …)
 * @returns {SiteAdapter} New adapter instance
 * @throws {Error} If site is not registered
 */
function createAdapter(site) {
  const factory = getFactory(site);
  return factory.createAdapter();
}

module.exports = { createAdapter, getAvailableSites };
