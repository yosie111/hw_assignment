// src/automation/sites/saucedemo/flows/checkoutFlow.js
// ★ DEPRECATED - Use src/automation/providers/saucedemo/pages/checkout-page.js instead
// This file is kept for backward compatibility

const { CartPage } = require('../../../providers/saucedemo/pages/cart-page');
const { CheckoutPage } = require('../../../providers/saucedemo/pages/checkout-page');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Steps 8-10: Cart → Checkout → Fill shipping → Finish → Screenshot
 * @deprecated Use CheckoutPage class instead
 */
async function checkout(page, { shipping, requestId }) {
  const screenshots = [];
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  // Navigate to cart
  await cartPage.goToCart();
  screenshots.push(await takeScreenshot(page, requestId, '3-cart-page'));

  await cartPage.clickCheckout();

  // Fill shipping info
  await checkoutPage.waitForShippingForm();
  await checkoutPage.fillShippingInfo(shipping);
  screenshots.push(await takeScreenshot(page, requestId, '4-shipping-filled'));

  await checkoutPage.clickContinue();

  // Order overview
  await checkoutPage.waitForOverview();
  const orderSummary = await checkoutPage.getOrderSummary();
  screenshots.push(await takeScreenshot(page, requestId, '5-order-overview'));

  // Finish order
  await checkoutPage.finishOrder();
  const confirmText = await checkoutPage.getConfirmationText();
  screenshots.push(await takeScreenshot(page, requestId, '6-order-complete'));

  return {
    status: 'completed',
    confirmText,
    ...orderSummary,
    screenshots,
  };
}

module.exports = { checkout };
