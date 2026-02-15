// src/automation/core/automation-registry.js
// Registry for managing platform providers

const { createLogger } = require('./logger');

const logger = createLogger('Registry');

/**
 * Automation Registry - manages available platform providers
 */
class AutomationRegistry {
  constructor() {
    this.providers = new Map();
  }

  /**
   * Register a platform provider
   * @param {string} platformName - Name of the platform
   * @param {Function} ProviderClass - Provider class constructor
   * @param {Object} config - Platform configuration
   */
  register(platformName, ProviderClass, config = {}) {
    logger.info(`Registering platform: ${platformName}`);
    
    if (this.providers.has(platformName)) {
      logger.warn(`Platform ${platformName} is already registered. Overwriting.`);
    }

    this.providers.set(platformName, {
      ProviderClass,
      config,
    });
  }

  /**
   * Get a platform provider instance
   * @param {string} platformName - Name of the platform
   * @returns {Object} Provider instance
   */
  getProvider(platformName) {
    if (!this.providers.has(platformName)) {
      throw new Error(`Platform ${platformName} is not registered`);
    }

    const { ProviderClass, config } = this.providers.get(platformName);
    return new ProviderClass(config);
  }

  /**
   * Check if a platform is registered
   * @param {string} platformName - Name of the platform
   * @returns {boolean}
   */
  hasProvider(platformName) {
    return this.providers.has(platformName);
  }

  /**
   * Get list of registered platforms
   * @returns {string[]}
   */
  getRegisteredPlatforms() {
    return Array.from(this.providers.keys());
  }

  /**
   * Remove a platform provider
   * @param {string} platformName - Name of the platform
   */
  unregister(platformName) {
    logger.info(`Unregistering platform: ${platformName}`);
    this.providers.delete(platformName);
  }

  /**
   * Clear all registered providers
   */
  clear() {
    logger.info('Clearing all registered providers');
    this.providers.clear();
  }
}

// Singleton instance
const registry = new AutomationRegistry();

module.exports = { AutomationRegistry, registry };
