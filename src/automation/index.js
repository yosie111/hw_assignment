// src/automation/index.js
// ★ Public API — only these two functions are exposed to the Services layer.

const { launchBrowser } = require('./browser/browserFactory');
const { login } = require('./sites/saucedemo/flows/loginFlow');
const { searchProducts } = require('./sites/saucedemo/flows/searchFlow');
const { addToCart } = require('./sites/saucedemo/flows/cartFlow');
const { checkout } = require('./sites/saucedemo/flows/checkoutFlow');
const { selectProduct } = require('./policies/selectProduct');
const { createStepLogger } = require('./utils/stepLogger');
const { validateSearchInput, validatePurchaseInput } = require('./utils/inputValidator');
const { takeScreenshot } = require('./utils/screenshot');
const config = require('./config');

/**
 * Search flow: validate → open browser → login → search → scrape → return products
 *
 * @param {Object} params
 * @param {string} params.query - Search text (empty string for all products)
 * @param {Object} [params.filters] - { maxPrice?: number }
 * @param {string} params.requestId - Unique request identifier
 * @param {Function} [params.onStep] - Callback: ({ requestId, step, status, durationMs, error? }) => void
 * @returns {Promise<Product[]>}
 */
async function search({ query, filters, requestId, onStep }) {
  validateSearchInput({ query, filters });

  const logger = createStepLogger(requestId, onStep);
  let browser;

  try {
    const launched = await logger.runStep('OpenBrowser', () => launchBrowser());
    browser = launched.browser;
    const page = launched.page;

    await logger.runStep('Login', () =>
      login(page, {
        username: config.USERNAME,
        password: config.PASSWORD,
        baseUrl: config.BASE_URL,
      })
    );

    const products = await logger.runStep('SearchAndScrape', () =>
      searchProducts(page, { query, filters })
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
 * @param {string} params.productTitle - Product name to find and purchase
 * @param {Object} params.shipping - { firstName, lastName, postalCode }
 * @param {string} params.requestId - Unique request identifier
 * @param {Function} [params.onStep] - Status callback
 * @returns {Promise<OrderResult>}
 */
async function purchase({ productTitle, shipping, requestId, onStep }) {
  validatePurchaseInput({ productTitle, shipping });

  const logger = createStepLogger(requestId, onStep);
  let browser;
  let page;
  let lastStep = 'Init';

  try {
    const launched = await logger.runStep('OpenBrowser', () => launchBrowser());
    browser = launched.browser;
    page = launched.page;

    await logger.runStep('Login', () =>
      login(page, {
        username: config.USERNAME,
        password: config.PASSWORD,
        baseUrl: config.BASE_URL,
      })
    );
    lastStep = 'Login';

    const cartResult = await logger.runStep('AddToCart', () =>
      addToCart(page, { title: productTitle, requestId })
    );
    lastStep = 'AddToCart';

    const checkoutResult = await logger.runStep('Checkout', () =>
      checkout(page, { shipping, requestId })
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
