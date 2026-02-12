// src/automation/sites/saucedemo/flows/cartFlow.js

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Steps 6-7: Select product → Add to Cart (with screenshots)
 *
 * Screenshots taken:
 *   1. product-detail — after navigating to the selected product page
 *   2. added-to-cart  — after item added, showing cart badge
 *
 * @param {import('playwright').Page} page - Already logged in, on inventory page
 * @param {Object} params
 * @param {string} params.title - Exact product title to add
 * @param {string} [params.requestId] - For screenshot naming
 * @returns {Promise<{ itemCount: number, screenshots: string[] }>}
 */
async function addToCart(page, { title, requestId = 'run' }) {
  const screenshots = [];

  // Click product title to navigate to detail page
  const productLink = page.locator(`text=${title}`);
  await productLink.waitFor({ state: 'visible' });
  await productLink.click();

  // Wait for detail page to load
  await page.locator(S.ADD_TO_CART_BTN).waitFor({ state: 'visible' });

  // ★ Screenshot 1: Product detail page (product selected)
  screenshots.push(await takeScreenshot(page, requestId, '1-product-detail'));

  // ★ Brittle action — wrapped in retry
  await withRetry(async () => {
    await page.locator(S.ADD_TO_CART_BTN).click();
    await page.locator(S.CART_BADGE).waitFor({ state: 'visible', timeout: 3000 });
  }, { label: 'AddToCart' });

  // Read badge count to confirm
  const badgeText = await page.locator(S.CART_BADGE).textContent();
  const itemCount = parseInt(badgeText, 10);

  if (isNaN(itemCount) || itemCount < 1) {
    throw new Error(`Cart badge shows unexpected value: "${badgeText}"`);
  }

  // ★ Screenshot 2: After add to cart (badge visible)
  screenshots.push(await takeScreenshot(page, requestId, '2-added-to-cart'));

  return { itemCount, screenshots };
}

module.exports = { addToCart };
