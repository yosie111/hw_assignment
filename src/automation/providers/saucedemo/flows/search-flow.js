// src/automation/providers/saucedemo/flows/search-flow.js

const { SearchPage } = require('../pages/search-page');

/**
 * Search flow for Saucedemo
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
 * @returns {Promise<Array>} Filtered and normalized product list
 */
async function searchProducts(page, { query, filters }) {
  const searchPage = new SearchPage(page);

  await searchPage.waitForInventory();
  await searchPage.sortByPriceLowToHigh();

  const products = await searchPage.scrapeAllProducts();
  const filtered = searchPage.filterProducts(products, query, filters);

  return filtered;
}

module.exports = { searchProducts };
