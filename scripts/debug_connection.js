// scripts/debug_connection.js
// Diagnose: Is it a network issue, DNS, or Playwright config?

const { chromium } = require('playwright');

(async () => {
  let browser;

  try {
    // Test 1: Can we even launch?
    console.log('Test 1: Launching browser...');
    browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    console.log('   ✅ Browser launched\n');

    // Test 2: Try Google first (rules out general network block)
    console.log('Test 2: Navigating to google.com...');
    try {
      await page.goto('https://www.google.com', { timeout: 20000 });
      console.log('   ✅ Google loaded — network works\n');
    } catch (e) {
      console.log('   ❌ Google failed too — general network issue');
      console.log(`   Error: ${e.message}\n`);
    }

    // Test 3: Try saucedemo with longer timeout
    console.log('Test 3: Navigating to saucedemo.com (30s timeout)...');
    try {
      await page.goto('https://www.saucedemo.com', { timeout: 30000 });
      console.log('   ✅ Saucedemo loaded!\n');
      console.log('   Title:', await page.title());
      console.log('   URL:', page.url());
    } catch (e) {
      console.log('   ❌ Saucedemo failed even with 30s timeout');
      console.log(`   Error: ${e.message}\n`);
    }

    // Test 4: Try with different waitUntil strategy
    console.log('Test 4: Trying with waitUntil: "commit" (fastest)...');
    const page2 = await browser.newPage();
    try {
      await page2.goto('https://www.saucedemo.com', {
        timeout: 30000,
        waitUntil: 'commit',
      });
      console.log('   ✅ Saucedemo loaded with "commit"!');
      console.log('   URL:', page2.url());
    } catch (e) {
      console.log('   ❌ Still failed');
      console.log(`   Error: ${e.message}`);
    }

  } catch (error) {
    console.error('Fatal:', error.message);
  } finally {
    if (browser) await browser.close();
    console.log('\n🔒 Browser closed.');
  }
})();
