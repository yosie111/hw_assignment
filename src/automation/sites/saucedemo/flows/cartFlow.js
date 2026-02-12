// src/automation/sites/saucedemo/flows/cartFlow.js

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');

/**
 * Steps 6-7: Select product → Add to Cart
 *
 * Navigates to the product detail page by clicking its title,
 * then clicks Add to Cart and validates via the cart badge.
 * The add-to-cart action is wrapped in retry for robustness.
 *
 * @param {import('playwright').Page} page - Already logged in, on inventory page
 * @param {Object} params
 * @param {string} params.title - Exact product title to add
 * @throws {Error} If product not found or add-to-cart fails after retries
 */
async function addToCart(page, { title }) {
  // Click product title to navigate to detail page
  const productLink = page.locator(`text=${title}`);
  await productLink.waitFor({ state: 'visible' });
  await productLink.click();

  // Wait for detail page to load
  await page.locator(S.ADD_TO_CART_BTN).waitFor({ state: 'visible' });

  // ★ Brittle action — wrapped in retry
  await withRetry(async () => {
    await page.locator(S.ADD_TO_CART_BTN).click();
    // Validate: cart badge appears (proves item was added)
    await page.locator(S.CART_BADGE).waitFor({ state: 'visible', timeout: 3000 });
  }, { label: 'AddToCart' });

  // Read badge count to confirm
  const badgeText = await page.locator(S.CART_BADGE).textContent();
  const itemCount = parseInt(badgeText, 10);

  if (isNaN(itemCount) || itemCount < 1) {
    throw new Error(`Cart badge shows unexpected value: "${badgeText}"`);
  }

  return { itemCount };
}

module.exports = { addToCart };
