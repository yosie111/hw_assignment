// src/automation/index.js
// ★ Public API — only these two functions are exposed to the Services layer.

const { launchBrowser } = require('./browser/browserFactory');
const { selectProduct } = require('./policies/selectProduct');
const { createStepLogger } = require('./utils/stepLogger');
const { validateSearchInput, validatePurchaseInput } = require('./utils/inputValidator');
const { takeScreenshot } = require('./utils/screenshot');
const config = require('./config');

// Site-specific imports
const saucedemoFlows = {
  login: require('./sites/saucedemo/flows/loginFlow').login,
  searchProducts: require('./sites/saucedemo/flows/searchFlow').searchProducts,
  addToCart: require('./sites/saucedemo/flows/cartFlow').addToCart,
  checkout: require('./sites/saucedemo/flows/checkoutFlow').checkout,
};

const amazonFlows = {
  login: require('./sites/amazon/flows/loginFlow').login,
  searchProducts: require('./sites/amazon/flows/searchFlow').searchProducts,
  addToCart: require('./sites/amazon/flows/cartFlow').addToCart,
  checkout: require('./sites/amazon/flows/checkoutFlow').checkout,
};

// Site configuration mapping
const siteConfigs = {
  saucedemo: {
    baseUrl: config.SAUCEDEMO_BASE_URL,
    username: config.SAUCEDEMO_USERNAME,
    password: config.SAUCEDEMO_PASSWORD,
    flows: saucedemoFlows,
  },
  amazon: {
    baseUrl: config.AMAZON_BASE_URL,
    username: config.AMAZON_USERNAME,
    password: config.AMAZON_PASSWORD,
    flows: amazonFlows,
  },
};

/**
 * Get site-specific configuration and flows
 * @param {string} site - Site identifier ('saucedemo' or 'amazon')
 * @returns {Object} Site configuration with flows
 */
function getSiteConfig(site) {
  const siteConfig = siteConfigs[site];
  if (!siteConfig) {
    throw new Error(`Unsupported site: ${site}. Available sites: ${Object.keys(siteConfigs).join(', ')}`);
  }
  return siteConfig;
}

/**
 * Search flow: validate → open browser → login → search → scrape → return products
 *
 * @param {Object} params
 * @param {string} [params.site='saucedemo'] - Site to search ('saucedemo' or 'amazon')
 * @param {string} params.query - Search text (empty string for all products)
 * @param {Object} [params.filters] - { maxPrice?: number }
 * @param {string} params.requestId - Unique request identifier
 * @param {Function} [params.onStep] - Callback: ({ requestId, step, status, durationMs, error? }) => void
 * @returns {Promise<Product[]>}
 */
async function search({ site = 'saucedemo', query, filters, requestId, onStep }) {
  validateSearchInput({ query, filters });

  const siteConfig = getSiteConfig(site);
  const logger = createStepLogger(requestId, onStep);
  let browser;

  try {
    const launched = await logger.runStep('OpenBrowser', () =>
      launchBrowser({ useAmazonSession: site === 'amazon' })
    );
    browser = launched.browser;
    const page = launched.page;

    await logger.runStep('Login', () =>
      siteConfig.flows.login(page, {
        username: siteConfig.username,
        password: siteConfig.password,
        baseUrl: siteConfig.baseUrl,
      })
    );

    const products = await logger.runStep('SearchAndScrape', () =>
      siteConfig.flows.searchProducts(page, { query, filters })
    );

    return products;

  } catch (error) {
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Purchase flow: validate → open browser → login → find product → add to cart → checkout → screenshot
 *
 * @param {Object} params
 * @param {string} [params.site='saucedemo'] - Site to purchase from ('saucedemo' or 'amazon')
 * @param {string} params.productTitle - Product name to find and purchase
 * @param {Object} params.shipping - { firstName, lastName, postalCode }
 * @param {string} params.requestId - Unique request identifier
 * @param {Function} [params.onStep] - Status callback
 * @returns {Promise<OrderResult>}
 */
async function purchase({ site = 'saucedemo', productTitle, shipping, requestId, onStep }) {
  validatePurchaseInput({ productTitle, shipping });

  const siteConfig = getSiteConfig(site);
  const logger = createStepLogger(requestId, onStep);
  let browser;
  let page;
  let lastStep = 'Init';

  try {
    const launched = await logger.runStep('OpenBrowser', () =>
      launchBrowser({ useAmazonSession: site === 'amazon' })
    );
    browser = launched.browser;
    page = launched.page;

    await logger.runStep('Login', () =>
      siteConfig.flows.login(page, {
        username: siteConfig.username,
        password: siteConfig.password,
        baseUrl: siteConfig.baseUrl,
      })
    );
    lastStep = 'Login';

    const cartResult = await logger.runStep('AddToCart', () =>
      siteConfig.flows.addToCart(page, { title: productTitle, requestId })
    );
    lastStep = 'AddToCart';

    const checkoutResult = await logger.runStep('Checkout', () =>
      siteConfig.flows.checkout(page, { shipping, requestId })
    );
    lastStep = 'Checkout';

    return {
      ...checkoutResult,
      cartScreenshots: cartResult.screenshots,
      lastStep,
      requestId,
      steps: logger.getSteps(),
    };

  } catch (error) {
    // ★ Error screenshot — capture state at failure
    let errorScreenshotPath = null;
    if (page) {
      try {
        errorScreenshotPath = await takeScreenshot(page, requestId, 'ERROR');
      } catch (_) { /* ignore screenshot failure */ }
    }

    return {
      status: 'failed',
      lastStep,
      requestId,
      error: error.message,
      screenshotPath: errorScreenshotPath,
      steps: logger.getSteps(),
    };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { search, purchase };