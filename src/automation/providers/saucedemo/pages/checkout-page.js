// src/automation/providers/saucedemo/pages/checkout-page.js
// Saucedemo Checkout Page

const { BasePage } = require('../../../core/base-page');

// Selectors
const SELECTORS = {
  FIRST_NAME: '[data-test="firstName"]',
  LAST_NAME: '[data-test="lastName"]',
  POSTAL_CODE: '[data-test="postalCode"]',
  CONTINUE_BUTTON: '[data-test="continue"]',
  SUMMARY_SUBTOTAL: '[data-test="subtotal-label"]',
  SUMMARY_TAX: '[data-test="tax-label"]',
  SUMMARY_TOTAL: '[data-test="total-label"]',
  FINISH_BUTTON: '[data-test="finish"]',
  COMPLETE_HEADER: '[data-test="complete-header"]',
};

/**
 * Checkout Page for Saucedemo
 */
class CheckoutPage extends BasePage {
  constructor(page) {
    super(page, 'CheckoutPage');
  }

  /**
   * Fill shipping information
   * @param {Object} shipping - { firstName, lastName, postalCode }
   */
  async fillShippingInfo(shipping) {
    this.logger.info('Filling shipping information');
    
    await this.waitForSelector(SELECTORS.FIRST_NAME);
    await this.fill(SELECTORS.FIRST_NAME, shipping.firstName);
    await this.fill(SELECTORS.LAST_NAME, shipping.lastName);
    await this.fill(SELECTORS.POSTAL_CODE, shipping.postalCode);
  }

  /**
   * Continue to order overview
   */
  async continue() {
    await this.click(SELECTORS.CONTINUE_BUTTON);
    await this.waitForSelector(SELECTORS.FINISH_BUTTON);
  }

  /**
   * Get order summary
   * @returns {Promise<Object>}
   */
  async getOrderSummary() {
    const subtotalText = await this.getText(SELECTORS.SUMMARY_SUBTOTAL);
    const taxText = await this.getText(SELECTORS.SUMMARY_TAX);
    const totalText = await this.getText(SELECTORS.SUMMARY_TOTAL);

    return {
      subtotalText: subtotalText.trim(),
      taxText: taxText.trim(),
      totalText: totalText.trim(),
    };
  }

  /**
   * Finish order
   */
  async finish() {
    this.logger.info('Finishing order');
    await this.click(SELECTORS.FINISH_BUTTON);
    await this.waitForSelector(SELECTORS.COMPLETE_HEADER);
  }

  /**
   * Get confirmation text
   * @returns {Promise<string>}
   */
  async getConfirmationText() {
    const text = await this.getText(SELECTORS.COMPLETE_HEADER);
    return text.trim();
  }
}

module.exports = { CheckoutPage };
