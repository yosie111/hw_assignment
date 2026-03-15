// src/automation/adapters/abstractFactory.js
//
// Abstract Factory Pattern — creates families of related site objects.
//
// Chapter 12 mapping:
//   AbstractFactory  = SiteAbstractFactory (this file)
//   ConcreteFactory  = SauceDemoFactory, ToolShopFactory, AmazonFactory
//   Product families = { adapter, flows } per site
//
// Why Abstract Factory here:
//   The original adapterFactory.js was a simple registry: site → adapter constructor.
//   But each adapter needs a CONSISTENT SET of related objects:
//     - The adapter itself (orchestration)
//     - The flow implementations (login, search, cart, checkout)
//     - The selectors (DOM selectors for that specific site)
//     - The credentials/config for that site
//
//   An Abstract Factory guarantees that when you create a "saucedemo family",
//   you get SauceDemoAdapter + saucedemo flows + saucedemo selectors.
//   You cannot accidentally create a SauceDemoAdapter that uses ToolShop flows.
//
// Usage:
//   const factory = getFactory('saucedemo');
//   const adapter = factory.createAdapter();  // SauceDemoAdapter
//   const flows   = factory.createFlows();    // { login, search, cart, checkout }
//   const config  = factory.getSiteConfig();  // { baseUrl, username, password }

const config = require('../config');

// ─── Abstract Factory (base class) ───

/**
 * Abstract Factory — defines the interface for creating families
 * of site-specific objects.
 * @abstract
 */
class SiteAbstractFactory {
  /**
   * Site identifier (matches the registry key and API parameter).
   * @returns {string}
   */
  get siteName() {
    throw new Error('SiteAbstractFactory.siteName must be implemented');
  }

  /**
   * Create the adapter for this site.
   * @returns {SiteAdapter}
   */
  createAdapter() {
    throw new Error('SiteAbstractFactory.createAdapter() must be implemented');
  }

  /**
   * Create the flow implementations for this site.
   * Returns an object with { login, search, addToCart, checkout } functions.
   * @returns {Object}
   */
  createFlows() {
    throw new Error('SiteAbstractFactory.createFlows() must be implemented');
  }

  /**
   * Get site-specific configuration (credentials, URLs).
   * @returns {Object}
   */
  getSiteConfig() {
    throw new Error('SiteAbstractFactory.getSiteConfig() must be implemented');
  }

  /**
   * Get the tax rate for this site's checkout.
   * Each site charges different tax — this keeps tax knowledge
   * in the site layer, not in services or global config.
   *
   * @returns {number} Tax rate (e.g. 0.08 for 8%, 0 for no tax)
   */
  getTaxRate() {
    return 0; // default: no tax (safe fallback)
  }
}

// ─── Concrete Factory: Saucedemo ───

class SauceDemoFactory extends SiteAbstractFactory {
  get siteName() {
    return 'saucedemo';
  }

  createAdapter() {
    const { SauceDemoAdapter } = require('./SauceDemoAdapter');
    return new SauceDemoAdapter();
  }

  createFlows() {
    return {
      login:    require('../sites/saucedemo/flows/loginFlow').login,
      search:   require('../sites/saucedemo/flows/searchFlow').searchProducts,
      addToCart: require('../sites/saucedemo/flows/cartFlow').addToCart,
      checkout: require('../sites/saucedemo/flows/checkoutFlow').checkout,
    };
  }

  getSiteConfig() {
    return {
      baseUrl:  config.SAUCEDEMO_BASE_URL,
      username: config.SAUCEDEMO_USERNAME,
      password: config.SAUCEDEMO_PASSWORD,
    };
  }

  /** Saucedemo charges 8% sales tax */
  getTaxRate() {
    return 0.08;
  }
}

// ─── Concrete Factory: ToolShop ───

class ToolShopFactory extends SiteAbstractFactory {
  get siteName() {
    return 'toolshop';
  }

  createAdapter() {
    const { ToolShopAdapter } = require('./ToolShopAdapter');
    return new ToolShopAdapter();
  }

  createFlows() {
    return {
      login:    require('../sites/toolshop/flows/loginFlow').login,
      search:   require('../sites/toolshop/flows/searchFlow').searchProducts,
      addToCart: require('../sites/toolshop/flows/cartFlow').addToCart,
      checkout: require('../sites/toolshop/flows/checkoutFlow').checkout,
    };
  }

  getSiteConfig() {
    return {
      baseUrl:  config.TOOLSHOP_BASE_URL,
      apiUrl:   config.TOOLSHOP_API_URL,
      email:    config.TOOLSHOP_EMAIL,
      password: config.TOOLSHOP_PASSWORD,
    };
  }

  /** ToolShop calculates tax server-side — Oracle uses 0 to avoid double-counting */
  getTaxRate() {
    return 0;
  }
}

// ─── Concrete Factory: Amazon ───

class AmazonFactory extends SiteAbstractFactory {
  get siteName() {
    return 'amazon';
  }

  createAdapter() {
    const { AmazonAdapter } = require('./AmazonAdapter');
    return new AmazonAdapter();
  }

  createFlows() {
    return {
      login:    require('../sites/amazon/flows/loginFlow').login,
      search:   require('../sites/amazon/flows/searchFlow').searchProducts,
      addToCart: require('../sites/amazon/flows/cartFlow').addToCart,
      checkout: require('../sites/amazon/flows/checkoutFlow').checkout,
    };
  }

  getSiteConfig() {
    return {
      baseUrl:  config.AMAZON_BASE_URL,
      username: config.AMAZON_USERNAME,
      password: config.AMAZON_PASSWORD,
    };
  }

  /** Amazon tax varies by state — Oracle uses 0, relies on site-side calculation */
  getTaxRate() {
    return 0;
  }
}

// ─── Factory Registry ───

/** @type {Map<string, SiteAbstractFactory>} */
const factoryRegistry = new Map([
  ['saucedemo', new SauceDemoFactory()],
  ['toolshop',  new ToolShopFactory()],
  ['amazon',    new AmazonFactory()],
]);

/**
 * Get the Abstract Factory for a site.
 * @param {string} site
 * @returns {SiteAbstractFactory}
 * @throws {Error} if site is not registered
 */
function getFactory(site) {
  const factory = factoryRegistry.get(site);
  if (!factory) {
    const available = Array.from(factoryRegistry.keys()).join(', ');
    throw new Error(`Unknown site: "${site}". Available: ${available}`);
  }
  return factory;
}

/**
 * List all registered site names (used by validators.js).
 * @returns {string[]}
 */
function getAvailableSites() {
  return Array.from(factoryRegistry.keys());
}

module.exports = {
  SiteAbstractFactory,
  SauceDemoFactory,
  ToolShopFactory,
  AmazonFactory,
  getFactory,
  getAvailableSites,
};
