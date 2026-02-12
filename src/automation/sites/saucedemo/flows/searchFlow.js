// src/automation/sites/saucedemo/flows/searchFlow.js

const S = require('../selectors');
const { parseProduct } = require('../parsers/productParser');

/**
 * Steps 3-5: Navigate to catalog → Sort → Scrape → Filter
 *
 * Saucedemo has no search input — instead we:
 * 1. Sort by price (low → high)
 * 2. Scrape ALL products from DOM
 * 3. Filter client-side by query (name match) and maxPrice
 *
 * @param {import('playwright').Page} page - Already logged in, on inventory page
 * @param {Object} params
 * @param {string} [params.query] - Text to match in product title (case-insensitive)
 * @param {Object} [params.filters] - { maxPrice?: number }
 * @returns {Promise<Product[]>} Filtered and normalized product list
 */
async function searchProducts(page, { query, filters }) {
  // Step 3: Ensure we're on inventory page
  await page.locator(S.INVENTORY_LIST).waitFor({ state: 'visible' });

  // Step 4: Sort by price low to high (Smart Filtering alternative to search)
  await page.locator(S.PRODUCT_SORT).selectOption('lohi');
  await page.locator(S.INVENTORY_ITEM).first().waitFor({ state: 'visible' });

  // Step 5: Extract ALL products from DOM
  const items = await page.locator(S.INVENTORY_ITEM).all();
  const products = [];

  for (const item of items) {
    const product = await parseProduct(item);
    products.push(product);
  }

  // Client-side filtering (since Saucedemo has no server-side search)
  let filtered = products;

  if (query && query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(p => p.title.toLowerCase().includes(q));
  }

  if (filters?.maxPrice != null) {
    filtered = filtered.filter(p => p.price <= filters.maxPrice);
  }

  return filtered;
}

module.exports = { searchProducts };
