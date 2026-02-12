// scripts/test_search.js
// Test: Login → Search → Scrape products → Filter → Display results
// Usage:
//   node scripts/test_search.js                        (all products)
//   node scripts/test_search.js --query sauce          (filter by name)
//   node scripts/test_search.js --max-price 15         (filter by price)
//   node scripts/test_search.js --query shirt --max-price 20

const { launchBrowser } = require('../src/automation/browser/browserFactory');
const { login } = require('../src/automation/sites/saucedemo/flows/loginFlow');
const { searchProducts } = require('../src/automation/sites/saucedemo/flows/searchFlow');
const config = require('../src/automation/config');

// Parse CLI args
const args = process.argv.slice(2);
const queryIdx = args.indexOf('--query');
const priceIdx = args.indexOf('--max-price');
const query = queryIdx !== -1 ? args[queryIdx + 1] : '';
const maxPrice = priceIdx !== -1 ? parseFloat(args[priceIdx + 1]) : undefined;

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

    console.log(`3. Searching products (query: "${query || '*all*'}", maxPrice: ${maxPrice ?? 'none'})...\n`);
    const products = await searchProducts(page, {
      query,
      filters: maxPrice != null ? { maxPrice } : {},
    });

    console.log(`   Found ${products.length} product(s):\n`);
    console.log('   ' + '-'.repeat(70));

    for (const p of products) {
      console.log(`   ID:     ${p.id}`);
      console.log(`   Title:  ${p.title}`);
      console.log(`   Price:  ${p.price} ${p.currency}`);
      console.log(`   URL:    ${p.productUrl}`);
      console.log(`   Image:  ${p.imageUrl ? '✅ yes' : '❌ no'}`);
      console.log(`   Source: ${p.source}`);
      console.log('   ' + '-'.repeat(70));
    }

    console.log(`\n✅ Step 3 PASSED — ${products.length} products scraped and normalized`);

  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    console.log('🔒 Browser closed.');
  }
})();
