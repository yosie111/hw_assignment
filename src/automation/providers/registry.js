// src/automation/providers/registry.js
// Factory pattern for platform providers

const providers = {};

/**
 * Register a platform provider
 * @param {string} name - Provider name (e.g., 'saucedemo', 'amazon')
 * @param {Class} ProviderClass - Provider class that extends PlatformProvider
 */
function register(name, ProviderClass) {
  providers[name] = ProviderClass;
}

/**
 * Get a registered provider class
 * @param {string} name - Provider name
 * @returns {Class} Provider class
 * @throws {Error} If provider not found
 */
function get(name) {
  const ProviderClass = providers[name];
  if (!ProviderClass) {
    throw new Error(`Provider not found: ${name}. Available: ${Object.keys(providers).join(', ')}`);
  }
  return ProviderClass;
}

/**
 * Get list of all registered provider names
 * @returns {string[]}
 */
function list() {
  return Object.keys(providers);
}

module.exports = { register, get, list };
