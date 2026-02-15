// scripts/test_checkout.js
// Test: Full E2E with 6 screenshots across the purchase flow
// Usage: node scripts/test_checkout.js

const { launchBrowser } = require('../src/automation/browser/factory');
const { login } = require('../src/automation/sites/saucedemo/flows/loginFlow');
const { searchProducts } = require('../src/automation/sites/saucedemo/flows/searchFlow');
const { addToCart } = require('../src/automation/sites/saucedemo/flows/cartFlow');
const { checkout } = require('../src/automation/sites/saucedemo/flows/checkoutFlow');
const { selectProduct } = require('../src/automation/policies/selectProduct');
const config = require('../src/automation/config');

(async () => {
  let browser;
  const allScreenshots = [];

  try {
    console.log('=== FULL E2E TEST (with screenshots) ===\n');

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

    console.log('5. Adding to cart (📸 x2)...');
    const cartResult = await addToCart(page, {
      title: chosen.title,
      requestId: 'e2e-001',
    });
    console.log(`   ✅ Cart badge: ${cartResult.itemCount} item(s)`);
    allScreenshots.push(...cartResult.screenshots);

    console.log('\n6. Checkout (📸 x4)...');
    const result = await checkout(page, {
      shipping: {
        firstName: 'Test',
        lastName: 'User',
        postalCode: '12345',
      },
      requestId: 'e2e-001',
    });
    allScreenshots.push(...result.screenshots);

    console.log(`   Status:  ${result.status}`);
    console.log(`   Confirm: ${result.confirmText}`);
    console.log(`   Total:   ${result.totalText}\n`);

    // Show all screenshots
    console.log(`📸 Screenshots captured (${allScreenshots.length}):`);
    allScreenshots.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));

    const success = result.status === 'completed' && result.confirmText.includes('Thank you');
    console.log(success
      ? '\n✅ Step 7 PASSED — Full E2E with 6 proof screenshots'
      : '\n❌ Step 7 FAILED — Unexpected result'
    );

    if (!success) process.exit(1);

  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    console.log('🔒 Browser closed.');
  }
})();
