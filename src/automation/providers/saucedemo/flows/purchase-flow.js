// src/automation/providers/saucedemo/flows/purchase-flow.js

const { CartPage } = require('../pages/cart-page');
const { CheckoutPage } = require('../pages/checkout-page');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Purchase flow - Add to cart and complete checkout
 * 
 * @param {import('playwright').Page} page - Already logged in, on inventory page
 * @param {Object} params
 * @param {string} params.productTitle - Product title to purchase
 * @param {Object} params.shipping - { firstName, lastName, postalCode }
 * @param {string} params.requestId - For screenshot naming
 * @returns {Promise<Object>} Order result with screenshots
 */
async function purchase(page, { productTitle, shipping, requestId }) {
  const screenshots = [];
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  // Step 1: Navigate to product detail and add to cart
  await cartPage.clickProductByTitle(productTitle);
  await cartPage.waitForProductDetail();

  // Screenshot 1: Product detail page
  screenshots.push(await takeScreenshot(page, requestId, '1-product-detail'));

  await cartPage.addToCart();
  const itemCount = await cartPage.getCartItemCount();

  // Screenshot 2: After add to cart
  screenshots.push(await takeScreenshot(page, requestId, '2-added-to-cart'));

  // Step 2: Go to cart
  await cartPage.goToCart();

  // Screenshot 3: Cart page
  screenshots.push(await takeScreenshot(page, requestId, '3-cart-page'));

  await cartPage.clickCheckout();

  // Step 3: Fill shipping information
  await checkoutPage.waitForShippingForm();
  await checkoutPage.fillShippingInfo(shipping);

  // Screenshot 4: Shipping form filled
  screenshots.push(await takeScreenshot(page, requestId, '4-shipping-filled'));

  await checkoutPage.clickContinue();

  // Step 4: Order overview
  await checkoutPage.waitForOverview();
  const orderSummary = await checkoutPage.getOrderSummary();

  // Screenshot 5: Order overview
  screenshots.push(await takeScreenshot(page, requestId, '5-order-overview'));

  // Step 5: Finish order
  await checkoutPage.finishOrder();
  const confirmText = await checkoutPage.getConfirmationText();

  // Screenshot 6: Order complete
  screenshots.push(await takeScreenshot(page, requestId, '6-order-complete'));

  return {
    status: 'completed',
    confirmText,
    ...orderSummary,
    screenshots,
    itemCount,
  };
}

module.exports = { purchase };
