// src/automation/providers/saucedemo/pages/inventory-page.js
// Saucedemo Inventory (Catalog) Page

const { BasePage } = require('../../../core/base-page');

// Selectors
const SELECTORS = {
  PRODUCT_SORT: '[data-test="product-sort-container"]',
  INVENTORY_LIST: '[data-test="inventory-list"]',
  INVENTORY_ITEM: '[data-test="inventory-item"]',
  ITEM_NAME: '[data-test="inventory-item-name"]',
  ITEM_PRICE: '[data-test="inventory-item-price"]',
  ITEM_DESC: '[data-test="inventory-item-desc"]',
  ADD_TO_CART_BTN: 'button[data-test^="add-to-cart"]',
  CART_BADGE: '[data-test="shopping-cart-badge"]',
};

/**
 * Inventory Page for Saucedemo
 */
class InventoryPage extends BasePage {
  constructor(page) {
    super(page, 'InventoryPage');
  }

  /**
   * Wait for inventory page to load
   */
  async waitForLoad() {
    await this.waitForSelector(SELECTORS.INVENTORY_LIST);
  }

  /**
   * Sort products by option
   * @param {string} option - Sort option (lohi, hilo, az, za)
   */
  async sortBy(option = 'lohi') {
    this.logger.info(`Sorting by ${option}`);
    await this.page.locator(SELECTORS.PRODUCT_SORT).selectOption(option);
    await this.page.locator(SELECTORS.INVENTORY_ITEM).first().waitFor({ state: 'visible' });
  }

  /**
   * Get all product items
   * @returns {Promise<Array>}
   */
  async getAllProducts() {
    const items = await this.page.locator(SELECTORS.INVENTORY_ITEM).all();
    const products = [];

    for (const item of items) {
      const title = await item.locator(SELECTORS.ITEM_NAME).textContent();
      const priceText = await item.locator(SELECTORS.ITEM_PRICE).textContent();
      const description = await item.locator(SELECTORS.ITEM_DESC).textContent();
      
      // Parse price (remove $ sign)
      const price = parseFloat(priceText.replace('$', ''));

      products.push({
        title: title.trim(),
        price,
        description: description.trim(),
      });
    }

    return products;
  }

  /**
   * Click on a product by title
   * @param {string} title - Product title
   */
  async clickProduct(title) {
    this.logger.info(`Clicking product: ${title}`);
    const productLink = this.page.locator(SELECTORS.ITEM_NAME, { hasText: title });
    await productLink.waitFor({ state: 'visible' });
    await productLink.click();
  }

  /**
   * Add product to cart from detail page
   */
  async addToCart() {
    this.logger.info('Adding product to cart');
    await this.click(SELECTORS.ADD_TO_CART_BTN);
    await this.waitForSelector(SELECTORS.CART_BADGE);
  }

  /**
   * Get cart item count
   * @returns {Promise<number>}
   */
  async getCartCount() {
    const badgeText = await this.getText(SELECTORS.CART_BADGE);
    return parseInt(badgeText, 10);
  }
}

module.exports = { InventoryPage };
