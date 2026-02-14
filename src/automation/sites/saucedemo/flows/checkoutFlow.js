// src/automation/sites/saucedemo/flows/checkoutFlow.js

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Steps 8-10: Cart → Checkout → Fill shipping → Finish → Screenshot
 *
 * Screenshots taken:
 *   3. cart-page        — cart contents before checkout
 *   4. shipping-filled  — checkout form with shipping details filled
 *   5. order-overview   — order summary with total before confirming
 *   6. order-complete   — final confirmation page (mandatory proof)
 *
 * @param {import('playwright').Page} page - Product already in cart
 * @param {Object} params
 * @param {Object} params.shipping - { firstName, lastName, postalCode }
 * @param {string} params.requestId - Unique identifier for screenshot naming
 * @returns {Promise<{ status, confirmText, totalText, screenshots[] }>}
 */
async function checkout(page, { shipping, requestId }) {
  const screenshots = [];

  // Step 8: Navigate to cart
  await page.locator(S.CART_LINK).click();
  await page.locator(S.CHECKOUT_BUTTON).waitFor({ state: 'visible' });

  // ★ Screenshot 3: Cart page
  screenshots.push(await takeScreenshot(page, requestId, '3-cart-page'));

  // Click Checkout
  await page.locator(S.CHECKOUT_BUTTON).click();

  // Step 9: Fill shipping info
  await page.locator(S.FIRST_NAME).waitFor({ state: 'visible' });
  await page.locator(S.FIRST_NAME).fill(shipping.firstName);
  await page.locator(S.LAST_NAME).fill(shipping.lastName);
  await page.locator(S.POSTAL_CODE).fill(shipping.postalCode);

  // ★ Screenshot 4: Shipping form filled
  screenshots.push(await takeScreenshot(page, requestId, '4-shipping-filled'));

  await page.locator(S.CONTINUE_BUTTON).click();

  // Overview page — capture subtotal, tax, total before finishing
  await page.locator(S.FINISH_BUTTON).waitFor({ state: 'visible' });
  const subtotalText = await page.locator(S.SUMMARY_SUBTOTAL).textContent();
  const taxText = await page.locator(S.SUMMARY_TAX).textContent();
  const totalText = await page.locator(S.SUMMARY_TOTAL).textContent();

  // ★ Screenshot 5: Order overview with total
  screenshots.push(await takeScreenshot(page, requestId, '5-order-overview'));

  // Finish order (brittle — retry)
  await withRetry(async () => {
    await page.locator(S.FINISH_BUTTON).click();
    await page.locator(S.COMPLETE_HEADER).waitFor({ state: 'visible', timeout: 5000 });
  }, { label: 'FinishCheckout' });

  // Read confirmation message
  const confirmText = await page.locator(S.COMPLETE_HEADER).textContent();

  // ★ Screenshot 6: Order complete — mandatory proof
  screenshots.push(await takeScreenshot(page, requestId, '6-order-complete'));

  return {
    status: 'completed',
    confirmText: confirmText.trim(),
    subtotalText: subtotalText.trim(),
    taxText: taxText.trim(),
    totalText: totalText.trim(),
    screenshots,
  };
}

module.exports = { checkout };
