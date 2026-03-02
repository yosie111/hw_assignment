// src/automation/sites/toolshop/flows/searchFlow.js
//
// Steps 3-5: Navigate to catalog → Search/Filter → Scrape products
//
// ToolShop has REAL server-side search (unlike SauceDemo).
// The search bar sends API requests to /products?q=...
// We use waitForResponse to know when results are loaded (no sleep!).

const S = require('../selectors');
const { parseProduct } = require('../parsers/productParser');

/**
 * Search products in ToolShop.
 *
 * @param {import('playwright').Page} page - Already logged in
 * @param {Object} params
 * @param {string} [params.query] - Search text
 * @param {Object} [params.filters] - { maxPrice?: number }
 * @param {string} params.baseUrl - ToolShop base URL
 * @returns {Promise<NormalizedProduct[]>}
 */
async function searchProducts(page, { query, filters, baseUrl }) {
  // Navigate to home / catalog
  await page.goto(baseUrl || 'https://practicesoftwaretesting.com', {
    waitUntil: 'domcontentloaded',
  });

  // Wait for product cards to appear (initial load)
  await page.locator(S.PRODUCT_CARD).first().waitFor({ state: 'visible', timeout: 15_000 });

  // If query provided — use the search bar (real server-side search)
  if (query && query.trim()) {
    await page.locator(S.SEARCH_INPUT).fill(query.trim());

    // Click search and wait for API response (explicit wait — no sleep!)
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/products') && resp.status() === 200,
      { timeout: 10_000 }
    );
    await page.locator(S.SEARCH_SUBMIT).click();
    await responsePromise;

    // Wait for DOM to update with new results
    await page.locator(S.PRODUCT_CARD).first().waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {}); // may return 0 results
  }

  // Sort by price (low → high) if available
  try {
    const sortResponsePromise = page.waitForResponse(
      resp => resp.url().includes('/products') && resp.status() === 200,
      { timeout: 10_000 }
    );
    await page.locator(S.SORT_SELECT).selectOption('price,asc');
    await sortResponsePromise;
    // Wait for sorted products
    await page.locator(S.PRODUCT_CARD).first().waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {});
  } catch (_) { /* sort not available or no results */ }

  // Scrape all visible product cards
  // ★ ToolShop lazy-loads cards — scroll to bottom first to trigger render
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // Wait a moment for lazy items to render in DOM
  await page.waitForFunction(
    (sel) => {
      const cards = document.querySelectorAll(sel);
      if (cards.length === 0) return true; // no results is valid
      const last = cards[cards.length - 1];
      return last.querySelector('[data-test="product-name"]') !== null;
    },
    S.PRODUCT_CARD,
    { timeout: 10_000 }
  ).catch(() => {}); // best-effort — parse whatever loaded

  const cards = await page.locator(S.PRODUCT_CARD).all();
  const products = [];

  for (let i = 0; i < cards.length; i++) {
    try {
      // Scroll card into view + verify it has product-name before parsing
      await cards[i].scrollIntoViewIfNeeded({ timeout: 3_000 }).catch(() => {});
      const hasName = await cards[i].locator('[data-test="product-name"]')
        .isVisible({ timeout: 2_000 }).catch(() => false);
      if (!hasName) {
        console.warn(`[ToolShop] Skipping product ${i}: no product-name visible`);
        continue;
      }
      const product = await parseProduct(cards[i], i);
      products.push(product);
    } catch (err) {
      console.warn(`[ToolShop] Failed to parse product ${i}: ${err.message}`);
    }
  }

  // Client-side filter by maxPrice
  let filtered = products;
  if (filters?.maxPrice != null) {
    filtered = filtered.filter(p => p.price <= filters.maxPrice);
  }

  return filtered;
}

module.exports = { searchProducts };
