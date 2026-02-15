// src/automation/sites/amazon/flows/checkoutFlow.js

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Amazon checkout flow: Cart → Checkout → Fill shipping → Review order → Screenshot
 *
 * Note: This is a simplified flow. Real Amazon checkout has many variations
 * and may require payment method selection. For testing, this goes as far as
 * the order review page.
 *
 * Screenshots taken:
 *   3. cart-page        — cart contents
 *   4. shipping-filled  — shipping address filled
 *   5. order-overview   — order summary page
 *   6. order-complete   — final confirmation (if reached)
 *
 * @param {import('playwright').Page} page - Product already in cart
 * @param {Object} params
 * @param {Object} params.shipping - { firstName, lastName, postalCode }
 * @param {string} params.requestId - Unique identifier for screenshot naming
 * @returns {Promise<{ status, confirmText, totalText, screenshots[] }>}
 */
async function checkout(page, { shipping, requestId }) {
  const screenshots = [];

  // Navigate to cart
  await page.locator(S.CART_LINK).click();
  await page.waitForTimeout(2000);

  // ★ Screenshot 3: Cart page
  screenshots.push(await takeScreenshot(page, requestId, '3-cart-page'));

  // Proceed to checkout
  try {
    const checkoutButton = page.locator(S.CHECKOUT_BUTTON).first();
    await checkoutButton.waitFor({ state: 'visible', timeout: 5000 });
    await checkoutButton.click();
  } catch (error) {
    throw new Error(`Failed to proceed to checkout: ${error.message}`);
  }

  await page.waitForTimeout(2000);

  // Fill shipping address if form is present
  try {
    const addressInput = page.locator(S.SHIPPING_ADDRESS);
    const isVisible = await addressInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      // Fill shipping details
      await addressInput.fill(`${shipping.firstName} ${shipping.lastName}`);
      
      const addressLine1 = page.locator(S.SHIPPING_ADDRESS_LINE1);
      if (await addressLine1.isVisible().catch(() => false)) {
        await addressLine1.fill('123 Test Street');
      }
      
      const city = page.locator(S.SHIPPING_CITY);
      if (await city.isVisible().catch(() => false)) {
        await city.fill('Test City');
      }
      
      const state = page.locator(S.SHIPPING_STATE);
      if (await state.isVisible().catch(() => false)) {
        await state.fill('CA');
      }
      
      const zip = page.locator(S.SHIPPING_ZIP);
      if (await zip.isVisible().catch(() => false)) {
        await zip.fill(shipping.postalCode);
      }

      // ★ Screenshot 4: Shipping form filled
      screenshots.push(await takeScreenshot(page, requestId, '4-shipping-filled'));
      
      // Submit address
      const useAddressButton = page.locator(S.USE_THIS_ADDRESS).first();
      if (await useAddressButton.isVisible().catch(() => false)) {
        await useAddressButton.click();
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('Shipping form not found, may already have saved address');
    }
  } catch (error) {
    console.log(`Shipping form handling: ${error.message}`);
  }

  // ★ Screenshot 5: Order overview/review page
  screenshots.push(await takeScreenshot(page, requestId, '5-order-overview'));

  // Try to get order total
  let totalText = 'Total not available';
  try {
    const totalElement = page.locator(S.ORDER_TOTAL).first();
    if (await totalElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      totalText = await totalElement.textContent();
    }
  } catch (error) {
    console.log('Could not get order total');
  }

  // Note: We don't actually place the order for testing purposes
  // In a real scenario, you would click "Place Order" here
  
  // ★ Screenshot 6: Final state (before placing order)
  screenshots.push(await takeScreenshot(page, requestId, '6-order-complete'));

  return {
    status: 'completed',
    confirmText: 'Order ready for placement (not submitted in test mode)',
    subtotalText: 'N/A',
    taxText: 'N/A', 
    totalText: totalText.trim(),
    screenshots,
  };
}

module.exports = { checkout };
