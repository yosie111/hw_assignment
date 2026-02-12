// src/automation/sites/saucedemo/flows/checkoutFlow.js

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Steps 8-10: Cart → Checkout → Fill shipping → Finish → Screenshot
 *
 * @param {import('playwright').Page} page - Product already in cart
 * @param {Object} params
 * @param {Object} params.shipping - { firstName, lastName, postalCode }
 * @param {string} params.requestId - Unique identifier for screenshot naming
 * @returns {Promise<{ status: string, screenshotPath: string, totalText: string }>}
 * @throws {Error} If checkout process fails
 */
async function checkout(page, { shipping, requestId }) {
  // Step 8: Navigate to cart → click Checkout
  await page.locator(S.CART_LINK).click();
  await page.locator(S.CHECKOUT_BUTTON).waitFor({ state: 'visible' });
  await page.locator(S.CHECKOUT_BUTTON).click();

  // Step 9: Fill shipping info
  await page.locator(S.FIRST_NAME).waitFor({ state: 'visible' });
  await page.locator(S.FIRST_NAME).fill(shipping.firstName);
  await page.locator(S.LAST_NAME).fill(shipping.lastName);
  await page.locator(S.POSTAL_CODE).fill(shipping.postalCode);
  await page.locator(S.CONTINUE_BUTTON).click();

  // Overview page — capture total before finishing
  await page.locator(S.FINISH_BUTTON).waitFor({ state: 'visible' });
  const totalText = await page.locator(S.SUMMARY_TOTAL).textContent();

  // Finish order (brittle — retry)
  await withRetry(async () => {
    await page.locator(S.FINISH_BUTTON).click();
    await page.locator(S.COMPLETE_HEADER).waitFor({ state: 'visible', timeout: 5000 });
  }, { label: 'FinishCheckout' });

  // Step 10: Proof screenshot of completion page
  const screenshotPath = await takeScreenshot(page, requestId);

  // Read confirmation message
  const confirmText = await page.locator(S.COMPLETE_HEADER).textContent();

  return {
    status: 'completed',
    confirmText: confirmText.trim(),
    totalText: totalText.trim(),
    screenshotPath,
  };
}

module.exports = { checkout };
