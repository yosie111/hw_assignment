// scripts/test_login.js
// Quick test: Login → Verify catalog page loaded → Count products → Close
// Usage:
//   node scripts/test_login.js              (Chromium - default)
//   node scripts/test_login.js --firefox    (Firefox)

const { launchBrowser, launchFirefox } = require('../src/automation/browser/browserFactory');
const { login } = require('../src/automation/sites/saucedemo/flows/loginFlow');
const config = require('../src/automation/config');

const useFirefox = process.argv.includes('--firefox');

(async () => {
  let browser;
  const browserName = useFirefox ? 'Firefox' : 'Chromium';

  try {
    console.log(`1. Opening ${browserName}...`);
    const launched = useFirefox ? await launchFirefox() : await launchBrowser();
    browser = launched.browser;
    const page = launched.page;

    console.log('2. Logging in to Saucedemo...');
    await login(page, {
      username: config.USERNAME,
      password: config.PASSWORD,
      baseUrl: config.BASE_URL,
    });
    console.log('   ✅ Login successful!');

    // Verify we're on the catalog page
    const currentUrl = page.url();
    console.log(`3. Current URL: ${currentUrl}`);

    // Count products on catalog page
    const productCount = await page.locator('[data-test="inventory-item"]').count();
    console.log(`4. Products found on catalog: ${productCount}`);

    // Get page title
    const title = await page.title();
    console.log(`5. Page title: "${title}"`);

    console.log(`\n✅ Steps 1-3 PASSED (${browserName}): Browser → Login → Catalog`);

    // ★ BONUS: Test bad login
    console.log('\n--- Testing bad login ---');
    const page2 = await browser.newPage();
    try {
      await login(page2, {
        username: 'wrong_user',
        password: 'wrong_pass',
        baseUrl: config.BASE_URL,
      });
      console.log('   ❌ Should have thrown an error!');
    } catch (err) {
      console.log(`   ✅ Bad login caught: "${err.message}"`);
    } finally {
      await page2.close();
    }

  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    console.log('\n🔒 Browser closed.');
  }
})();
