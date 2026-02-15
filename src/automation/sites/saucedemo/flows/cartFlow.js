// src/automation/sites/saucedemo/flows/cartFlow.js
// ★ DEPRECATED - Use src/automation/providers/saucedemo/pages/cart-page.js instead
// This file is kept for backward compatibility

const { CartPage } = require('../../../providers/saucedemo/pages/cart-page');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Steps 6-7: Select product → Add to Cart (with screenshots)
 * @deprecated Use CartPage class instead
 */
async function addToCart(page, { title, requestId = 'run' }) {
  const screenshots = [];
  const cartPage = new CartPage(page);

  await cartPage.clickProductByTitle(title);
  await cartPage.waitForProductDetail();

  screenshots.push(await takeScreenshot(page, requestId, '1-product-detail'));

  await cartPage.addToCart();
  const itemCount = await cartPage.getCartItemCount();

  screenshots.push(await takeScreenshot(page, requestId, '2-added-to-cart'));

  return { itemCount, screenshots };
}

module.exports = { addToCart };
