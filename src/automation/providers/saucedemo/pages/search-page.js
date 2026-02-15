// src/automation/providers/saucedemo/pages/search-page.js

const { SELECTORS } = require('../config');
const { parseProduct } = require('./product-page');

/**
 * SearchPage - Page Object for Saucedemo product search/catalog
 */
class SearchPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Wait for inventory page to be visible
   */
  async waitForInventory() {
    await this.page.locator(SELECTORS.INVENTORY_LIST).waitFor({ state: 'visible' });
  }

  /**
   * Sort products by price (low to high)
   */
  async sortByPriceLowToHigh() {
    await this.page.locator(SELECTORS.PRODUCT_SORT).selectOption('lohi');
    await this.page.locator(SELECTORS.INVENTORY_ITEM).first().waitFor({ state: 'visible' });
  }

  /**
   * Get all product elements
   * @returns {Promise<Array>} Array of product locators
   */
  async getAllProductElements() {
    return await this.page.locator(SELECTORS.INVENTORY_ITEM).all();
  }

  /**
   * Scrape all products from the page
   * @returns {Promise<Array>} Array of normalized product objects
   */
  async scrapeAllProducts() {
    const items = await this.getAllProductElements();
    const products = [];

    for (const item of items) {
      const product = await parseProduct(item);
      products.push(product);
    }

    return products;
  }

  /**
   * Filter products by query and price
   * @param {Array} products - Product list
   * @param {string} query - Search query
   * @param {Object} filters - { maxPrice?: number }
   * @returns {Array} Filtered products
   */
  filterProducts(products, query, filters) {
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
}

module.exports = { SearchPage };
