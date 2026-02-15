// src/automation/sites/amazon/flows/searchFlow.js

const S = require('../selectors');
const { parseProduct } = require('../parsers/productParser');

/**
 * Amazon search flow: Search → Parse results → Filter
 *
 * @param {import('playwright').Page} page - Already logged in
 * @param {Object} params
 * @param {string} [params.query] - Search query text
 * @param {Object} [params.filters] - { maxPrice?: number }
 * @returns {Promise<Product[]>} Filtered and normalized product list
 */
async function searchProducts(page, { query, filters }) {
  // Navigate to homepage if not already there
  const currentUrl = page.url();
  if (!currentUrl.includes('amazon.com')) {
    await page.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded' });
  }

  // Perform search
  const searchInput = page.locator(S.SEARCH_INPUT);
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  
  // If query is empty, search for a default category (e.g., "electronics")
  const searchQuery = query && query.trim() ? query.trim() : 'electronics';
  
  await searchInput.fill(searchQuery);
  await page.locator(S.SEARCH_BUTTON).click();

  // Wait for search results
  await page.waitForTimeout(2000); // Give results time to load
  await page.locator(S.SEARCH_RESULTS).first().waitFor({ 
    state: 'visible', 
    timeout: 10000 
  }).catch(() => {
    console.log('Search results taking longer to load, continuing...');
  });

  // Parse all product results
  const productElements = await page.locator(S.SEARCH_RESULTS).all();
  const products = [];

  // Limit to first 20 products for performance
  const maxProducts = Math.min(productElements.length, 20);
  
  for (let i = 0; i < maxProducts; i++) {
    try {
      const product = await parseProduct(productElements[i]);
      if (product && product.title && product.price > 0) {
        products.push(product);
      }
    } catch (error) {
      // Skip products that fail to parse
      console.log(`Failed to parse product ${i + 1}: ${error.message}`);
    }
  }

  // Client-side filtering
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
