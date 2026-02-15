// src/automation/sites/amazon/flows/cartFlow.js

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Amazon cart flow: Find product → Navigate to detail → Add to Cart
 *
 * Screenshots taken:
 *   1. product-detail — product page before adding to cart
 *   2. added-to-cart  — confirmation after item added
 *
 * @param {import('playwright').Page} page - Already logged in, search completed
 * @param {Object} params
 * @param {string} params.title - Product title to find and add
 * @param {string} [params.requestId] - For screenshot naming
 * @returns {Promise<{ itemCount: number, screenshots: string[] }>}
 */
async function addToCart(page, { title, requestId = 'run' }) {
  const screenshots = [];

  // Search for the product if not already on search results
  const searchInput = page.locator(S.SEARCH_INPUT);
  const isSearchInputVisible = await searchInput.isVisible().catch(() => false);
  
  if (isSearchInputVisible) {
    await searchInput.fill(title);
    await page.locator(S.SEARCH_BUTTON).click();
    await page.waitForTimeout(2000);
  }

  // Find and click on the product link
  try {
    // Look for product title link containing the search term
    const productLinks = await page.locator('h2 a span').all();
    let foundProduct = null;
    
    for (const link of productLinks) {
      const text = await link.textContent();
      if (text && text.toLowerCase().includes(title.toLowerCase())) {
        foundProduct = link;
        break;
      }
    }
    
    if (!foundProduct) {
      throw new Error(`Product "${title}" not found in search results`);
    }
    
    await foundProduct.click();
  } catch (error) {
    throw new Error(`Failed to navigate to product: ${error.message}`);
  }

  // Wait for product detail page to load
  await page.waitForTimeout(2000);

  // ★ Screenshot 1: Product detail page
  screenshots.push(await takeScreenshot(page, requestId, '1-product-detail'));

  // Add to cart - try multiple selectors as Amazon has variations
  await withRetry(async () => {
    const addButton = page.locator(S.ADD_TO_CART_BTN).first();
    const addButtonAlt = page.locator(S.ADD_TO_CART_ALT).first();
    
    const primaryVisible = await addButton.isVisible().catch(() => false);
    const altVisible = await addButtonAlt.isVisible().catch(() => false);
    
    if (primaryVisible) {
      await addButton.click();
    } else if (altVisible) {
      await addButtonAlt.click();
    } else {
      throw new Error('Add to cart button not found');
    }
    
    // Wait for cart confirmation or cart count to update
    await page.waitForTimeout(2000);
  }, { label: 'AddToCart' });

  // Get cart count
  let itemCount = 1; // Default to 1 if we can't read the badge
  try {
    const cartBadge = page.locator(S.CART_COUNT);
    const badgeText = await cartBadge.textContent({ timeout: 3000 });
    itemCount = parseInt(badgeText, 10) || 1;
  } catch (error) {
    console.log('Could not read cart count, defaulting to 1');
  }

  // ★ Screenshot 2: After add to cart
  screenshots.push(await takeScreenshot(page, requestId, '2-added-to-cart'));

  return { itemCount, screenshots };
}

module.exports = { addToCart };
