// scripts/test_select.js
// Test: selectProduct policy — unit tests + live integration
// Usage: node scripts/test_select.js

const { selectProduct } = require('../src/automation/policies/selectProduct');
const { launchBrowser } = require('../src/automation/browser/browserFactory');
const { login } = require('../src/automation/sites/saucedemo/flows/loginFlow');
const { searchProducts } = require('../src/automation/sites/saucedemo/flows/searchFlow');
const config = require('../src/automation/config');

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`   ✅ ${label}`);
    passed++;
  } else {
    console.log(`   ❌ ${label}`);
    failed++;
  }
}

(async () => {
  // ========== UNIT TESTS ==========
  console.log('=== Unit Tests ===\n');

  const mockProducts = [
    { id: 'a', title: 'Expensive', price: 49.99, currency: 'USD' },
    { id: 'b', title: 'Cheap', price: 7.99, currency: 'USD' },
    { id: 'c', title: 'Mid', price: 15.99, currency: 'USD' },
  ];

  // CHEAPEST policy
  const cheapest = selectProduct(mockProducts, 'CHEAPEST');
  assert('CHEAPEST returns lowest price', cheapest.id === 'b' && cheapest.price === 7.99);

  // FIRST policy
  const first = selectProduct(mockProducts, 'FIRST');
  assert('FIRST returns first item', first.id === 'a');

  // Single product
  const single = selectProduct([mockProducts[1]], 'CHEAPEST');
  assert('Single product returns itself', single.id === 'b');

  // Empty list throws
  try {
    selectProduct([], 'CHEAPEST');
    assert('Empty list throws error', false);
  } catch (e) {
    assert('Empty list throws error', e.message === 'No products available for selection');
  }

  // Unknown policy throws
  try {
    selectProduct(mockProducts, 'RANDOM');
    assert('Unknown policy throws error', false);
  } catch (e) {
    assert('Unknown policy throws error', e.message.includes('Unknown selection policy'));
  }

  // Default policy is CHEAPEST
  const defaultPolicy = selectProduct(mockProducts);
  assert('Default policy is CHEAPEST', defaultPolicy.id === 'b');

  // ========== LIVE INTEGRATION ==========
  console.log('\n=== Live Integration Test ===\n');

  let browser;
  try {
    const launched = await launchBrowser();
    browser = launched.browser;
    const page = launched.page;

    await login(page, {
      username: config.USERNAME,
      password: config.PASSWORD,
      baseUrl: config.BASE_URL,
    });

    const products = await searchProducts(page, { query: '', filters: {} });
    assert(`Scraped ${products.length} products from Saucedemo`, products.length > 0);

    const liveCheapest = selectProduct(products, 'CHEAPEST');
    const liveFirst = selectProduct(products, 'FIRST');

    console.log(`\n   CHEAPEST: "${liveCheapest.title}" — $${liveCheapest.price}`);
    console.log(`   FIRST:    "${liveFirst.title}" — $${liveFirst.price}`);

    assert('CHEAPEST price <= FIRST price', liveCheapest.price <= liveFirst.price);
    assert('Selected product has valid id', liveCheapest.id && liveCheapest.id.length > 0);
    assert('Selected product has source', liveCheapest.source === 'Saucedemo');

  } catch (error) {
    console.error('   ❌ Live test failed:', error.message);
    failed++;
  } finally {
    if (browser) await browser.close();
  }

  // ========== SUMMARY ==========
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '✅ Step 5 PASSED' : '❌ Step 5 has failures');

  if (failed > 0) process.exit(1);
})();
