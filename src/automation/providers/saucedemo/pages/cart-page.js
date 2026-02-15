// src/automation/providers/saucedemo/pages/cart-page.js
// Saucedemo Cart Page

const { BasePage } = require('../../../core/base-page');

// Selectors
const SELECTORS = {
  CART_LINK: '[data-test="shopping-cart-link"]',
  CART_ITEM: '[data-test="inventory-item"]',
  CHECKOUT_BUTTON: '[data-test="checkout"]',
};

/**
 * Cart Page for Saucedemo
 */
class CartPage extends BasePage {
  constructor(page) {
    super(page, 'CartPage');
  }

  /**
   * Navigate to cart page
   */
  async navigate() {
    this.logger.info('Navigating to cart');
    await this.click(SELECTORS.CART_LINK);
    await this.waitForSelector(SELECTORS.CHECKOUT_BUTTON);
  }

  /**
   * Get cart items count
   * @returns {Promise<number>}
   */
  async getItemCount() {
    const items = await this.page.locator(SELECTORS.CART_ITEM).count();
    return items;
  }

  /**
   * Proceed to checkout
   */
  async checkout() {
    this.logger.info('Proceeding to checkout');
    await this.click(SELECTORS.CHECKOUT_BUTTON);
  }
}

module.exports = { CartPage };
