// src/automation/providers/saucedemo/flows/purchase-flow.js
// Saucedemo Purchase Flow using Page Objects

const { LoginPage } = require('../pages/login-page');
const { InventoryPage } = require('../pages/inventory-page');
const { CartPage } = require('../pages/cart-page');
const { CheckoutPage } = require('../pages/checkout-page');
const { takeScreenshot } = require('../../../utils/screenshot');
const { withRetry } = require('../../../utils/retry');

/**
 * Complete purchase flow for Saucedemo
 * @param {import('playwright').Page} page - Browser page
 * @param {Object} params - Purchase parameters
 * @param {string} params.productTitle - Product to purchase
 * @param {Object} params.shipping - Shipping info { firstName, lastName, postalCode }
 * @param {string} params.username - Login username
 * @param {string} params.password - Login password
 * @param {string} params.baseUrl - Base URL
 * @param {string} params.requestId - Request ID for screenshots
 * @returns {Promise<Object>}
 */
async function executePurchaseFlow(page, params) {
  const { productTitle, shipping, username, password, baseUrl, requestId } = params;
  const screenshots = [];

  // Initialize page objects
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  // Step 1: Login
  await loginPage.navigate(baseUrl);
  await loginPage.login(username, password);

  // Step 2: Find and add product to cart
  await inventoryPage.waitForLoad();
  await inventoryPage.clickProduct(productTitle);
  
  // Screenshot: Product detail page
  screenshots.push(await takeScreenshot(page, requestId, '1-product-detail'));

  // Add to cart with retry
  await withRetry(async () => {
    await inventoryPage.addToCart();
    const count = await inventoryPage.getCartCount();
    if (count < 1) {
      throw new Error('Cart count is 0');
    }
  }, { label: 'AddToCart' });

  // Screenshot: After add to cart
  screenshots.push(await takeScreenshot(page, requestId, '2-added-to-cart'));

  // Step 3: Navigate to cart
  await cartPage.navigate();
  
  // Screenshot: Cart page
  screenshots.push(await takeScreenshot(page, requestId, '3-cart-page'));

  // Step 4: Checkout - Fill shipping
  await cartPage.checkout();
  await checkoutPage.fillShippingInfo(shipping);

  // Screenshot: Shipping filled
  screenshots.push(await takeScreenshot(page, requestId, '4-shipping-filled'));

  // Step 5: Continue to overview
  await checkoutPage.continue();
  const summary = await checkoutPage.getOrderSummary();

  // Screenshot: Order overview
  screenshots.push(await takeScreenshot(page, requestId, '5-order-overview'));

  // Step 6: Finish order with retry
  await withRetry(async () => {
    await checkoutPage.finish();
  }, { label: 'FinishCheckout' });

  const confirmText = await checkoutPage.getConfirmationText();

  // Screenshot: Order complete
  screenshots.push(await takeScreenshot(page, requestId, '6-order-complete'));

  return {
    status: 'completed',
    confirmText,
    ...summary,
    screenshots,
  };
}

module.exports = { executePurchaseFlow };
