// src/automation/providers/saucedemo/pages/checkout-page.js

const { SELECTORS } = require('../config');
const { withRetry } = require('../../../utils/retry');

/**
 * CheckoutPage - Page Object for Saucedemo checkout process
 */
class CheckoutPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Wait for shipping information form
   */
  async waitForShippingForm() {
    await this.page.locator(SELECTORS.FIRST_NAME).waitFor({ state: 'visible' });
  }

  /**
   * Fill shipping information
   * @param {Object} shipping - { firstName, lastName, postalCode }
   */
  async fillShippingInfo(shipping) {
    await this.page.locator(SELECTORS.FIRST_NAME).fill(shipping.firstName);
    await this.page.locator(SELECTORS.LAST_NAME).fill(shipping.lastName);
    await this.page.locator(SELECTORS.POSTAL_CODE).fill(shipping.postalCode);
  }

  /**
   * Click continue button
   */
  async clickContinue() {
    await this.page.locator(SELECTORS.CONTINUE_BUTTON).click();
  }

  /**
   * Wait for order overview page
   */
  async waitForOverview() {
    await this.page.locator(SELECTORS.FINISH_BUTTON).waitFor({ state: 'visible' });
  }

  /**
   * Get order summary information
   * @returns {Promise<Object>} { subtotalText, taxText, totalText }
   */
  async getOrderSummary() {
    const subtotalText = await this.page.locator(SELECTORS.SUMMARY_SUBTOTAL).textContent();
    const taxText = await this.page.locator(SELECTORS.SUMMARY_TAX).textContent();
    const totalText = await this.page.locator(SELECTORS.SUMMARY_TOTAL).textContent();

    return {
      subtotalText: subtotalText.trim(),
      taxText: taxText.trim(),
      totalText: totalText.trim(),
    };
  }

  /**
   * Finish the order (with retry)
   */
  async finishOrder() {
    await withRetry(async () => {
      await this.page.locator(SELECTORS.FINISH_BUTTON).click();
      await this.page.locator(SELECTORS.COMPLETE_HEADER).waitFor({ state: 'visible', timeout: 5000 });
    }, { label: 'FinishCheckout' });
  }

  /**
   * Get confirmation message
   * @returns {Promise<string>}
   */
  async getConfirmationText() {
    const confirmText = await this.page.locator(SELECTORS.COMPLETE_HEADER).textContent();
    return confirmText.trim();
  }
}

module.exports = { CheckoutPage };
