// scripts/test_cart.js
// Test: Login → Search → Select product → Add to Cart → Verify badge
// Usage: node scripts/test_cart.js

const { launchBrowser } = require('../src/automation/browser/browserFactory');
const { login } = require('../src/automation/sites/saucedemo/flows/loginFlow');
const { searchProducts } = require('../src/automation/sites/saucedemo/flows/searchFlow');
const { addToCart } = require('../src/automation/sites/saucedemo/flows/cartFlow');
const { selectProduct } = require('../src/automation/policies/selectProduct');
const config = require('../src/automation/config');

(async () => {
  let browser;

  try {
    console.log('1. Opening browser...');
    const launched = await launchBrowser();
    browser = launched.browser;
    const page = launched.page;

    console.log('2. Logging in...');
    await login(page, {
      username: config.USERNAME,
      password: config.PASSWORD,
      baseUrl: config.BASE_URL,
    });
    console.log('   ✅ Login successful\n');

    console.log('3. Searching products...');
    const products = await searchProducts(page, { query: '', filters: {} });
    console.log(`   Found ${products.length} products\n`);

    console.log('4. Selecting cheapest product...');
    const chosen = selectProduct(products, 'CHEAPEST');
    console.log(`   Selected: "${chosen.title}" — $${chosen.price}\n`);

    console.log('5. Adding to cart...');
    const { itemCount } = await addToCart(page, { title: chosen.title });
    console.log(`   ✅ Added! Cart badge shows: ${itemCount} item(s)\n`);

    // Verify by navigating to cart page
    console.log('6. Verifying cart contents...');
    await page.locator('[data-test="shopping-cart-link"]').click();
    await page.locator('[data-test="inventory-item"]').first().waitFor({ state: 'visible' });

    const cartItemName = await page.locator('[data-test="inventory-item-name"]').textContent();
    const cartItemPrice = await page.locator('[data-test="inventory-item-price"]').textContent();

    console.log(`   Cart contains: "${cartItemName}" — ${cartItemPrice}`);

    const match = cartItemName.trim() === chosen.title;
    console.log(match
      ? `\n✅ Step 6 PASSED — "${chosen.title}" added to cart successfully`
      : `\n❌ Step 6 FAILED — Expected "${chosen.title}" but found "${cartItemName}"`
    );

    if (!match) process.exit(1);

  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    console.log('🔒 Browser closed.');
  }
})();
