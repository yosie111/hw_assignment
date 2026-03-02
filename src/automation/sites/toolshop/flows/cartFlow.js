// src/automation/sites/toolshop/flows/cartFlow.js
//
// Steps 6-7: Select product → Click into detail → Add to Cart
//
// ToolShop flow:
//   1. Click product card on catalog → navigates to /product/{id}
//   2. Click "Add to Cart" button on detail page
//   3. Toast message appears ("Product added to cart")
//   4. Cart badge updates with item count

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Add a product to the cart in ToolShop.
 *
 * @param {import('playwright').Page} page - Logged in, on catalog page
 * @param {Object} params
 * @param {string} params.title - Exact product title to add
 * @param {string} [params.requestId] - For screenshot naming
 * @param {string} params.baseUrl - ToolShop base URL
 * @returns {Promise<{ itemCount: number, screenshots: string[] }>}
 */
async function addToCart(page, { title, requestId = 'run', baseUrl }) {
  const screenshots = [];

  // ★ Navigate to home and SEARCH for the product by name
  // (product may not be on default first page — e.g. "Washers" only shows after sort/search)
  await page.goto(baseUrl || 'https://practicesoftwaretesting.com', {
    waitUntil: 'domcontentloaded',
  });
  await page.locator(S.SEARCH_INPUT).waitFor({ state: 'visible', timeout: 15_000 });

  // Search for the product by exact title
  await page.locator(S.SEARCH_INPUT).fill(title);
  const responsePromise = page.waitForResponse(
    resp => resp.url().includes('/products') && resp.status() === 200,
    { timeout: 10_000 }
  );
  await page.locator(S.SEARCH_SUBMIT).click();
  await responsePromise;

  // Wait for results to render
  await page.locator(S.PRODUCT_CARD).first().waitFor({ state: 'visible', timeout: 10_000 });

  // Find and click the product card by title
  const productLink = page.locator(S.PRODUCT_CARD).filter({
    has: page.locator(S.PRODUCT_NAME, { hasText: title }),
  });
  await productLink.first().waitFor({ state: 'visible', timeout: 10_000 });
  await productLink.first().click();

  // Wait for product detail page — Add to Cart button is the indicator
  await page.locator(S.ADD_TO_CART_BTN).waitFor({ state: 'visible', timeout: 10_000 });

  // ★ Screenshot 1: Product detail page
  screenshots.push(await takeScreenshot(page, requestId, '1-product-detail'));

  // Add to cart with retry (toast + badge confirmation)
  await withRetry(async () => {
    await page.locator(S.ADD_TO_CART_BTN).click();

    // Wait for confirmation: either toast message or cart badge update
    await Promise.race([
      page.locator(S.ADDED_TOAST).waitFor({ state: 'visible', timeout: 5_000 }),
      page.locator(S.CART_QUANTITY).waitFor({ state: 'visible', timeout: 5_000 }),
    ]);
  }, { label: 'ToolShop-AddToCart' });

  // Read cart count from badge
  let itemCount = 1;
  try {
    const badgeText = await page.locator(S.CART_QUANTITY).textContent({ timeout: 3_000 });
    const parsed = parseInt(badgeText, 10);
    if (!isNaN(parsed) && parsed > 0) itemCount = parsed;
  } catch (_) { /* badge may not be visible, assume 1 */ }

  // ★ Screenshot 2: After add to cart
  screenshots.push(await takeScreenshot(page, requestId, '2-added-to-cart'));

  return { itemCount, screenshots };
}

module.exports = { addToCart };
