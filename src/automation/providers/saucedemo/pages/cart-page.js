// src/automation/providers/saucedemo/pages/cart-page.js

const { SELECTORS } = require('../config');
const { withRetry } = require('../../../utils/retry');

/**
 * CartPage - Page Object for Saucedemo cart operations
 */
class CartPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Click on product title to navigate to detail page
   * @param {string} productTitle - Exact product title
   */
  async clickProductByTitle(productTitle) {
    const productLink = this.page.locator(SELECTORS.ITEM_NAME, { hasText: productTitle });
    await productLink.waitFor({ state: 'visible' });
    await productLink.click();
  }

  /**
   * Wait for product detail page to load
   */
  async waitForProductDetail() {
    await this.page.locator(SELECTORS.ADD_TO_CART_BTN).waitFor({ state: 'visible' });
  }

  /**
   * Add product to cart with retry
   */
  async addToCart() {
    await withRetry(async () => {
      await this.page.locator(SELECTORS.ADD_TO_CART_BTN).click();
      await this.page.locator(SELECTORS.CART_BADGE).waitFor({ state: 'visible', timeout: 3000 });
    }, { label: 'AddToCart' });
  }

  /**
   * Get cart item count from badge
   * @returns {Promise<number>}
   */
  async getCartItemCount() {
    const badgeText = await this.page.locator(SELECTORS.CART_BADGE).textContent();
    const itemCount = parseInt(badgeText, 10);

    if (isNaN(itemCount) || itemCount < 1) {
      throw new Error(`Cart badge shows unexpected value: "${badgeText}"`);
    }

    return itemCount;
  }

  /**
   * Navigate to cart page
   */
  async goToCart() {
    await this.page.locator(SELECTORS.CART_LINK).click();
    await this.page.locator(SELECTORS.CHECKOUT_BUTTON).waitFor({ state: 'visible' });
  }

  /**
   * Click checkout button
   */
  async clickCheckout() {
    await this.page.locator(SELECTORS.CHECKOUT_BUTTON).click();
  }
}

module.exports = { CartPage };
