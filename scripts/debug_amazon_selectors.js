const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const config = require('../src/automation/config');
const S = require('../src/automation/sites/amazon/selectors');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'en-US' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  // Login
  await page.goto(config.AMAZON_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator(S.SIGN_IN_LINK).click();
  await page.waitForTimeout(3000);

  const emailInput = page.locator(S.EMAIL_INPUT);
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(config.AMAZON_USERNAME);
    await page.locator(S.CONTINUE_BUTTON).click();
    await page.waitForTimeout(3000);
  }

  const passInput = page.locator(S.PASSWORD_INPUT);
  if (await passInput.isVisible().catch(() => false)) {
    await passInput.fill(config.AMAZON_PASSWORD);
    await page.locator(S.SIGN_IN_BUTTON).click();
    await page.waitForTimeout(3000);
  }

  // Skip interstitial
  const notNow = page.locator('a:has-text("Not now"), button:has-text("Not now")');
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
  await page.waitForTimeout(2000);

  // Search
  console.log('Searching for "laptop"...');
  await page.locator(S.SEARCH_INPUT).fill('laptop');
  await page.locator(S.SEARCH_BUTTON).click();
  await page.waitForTimeout(3000);

  // Inspect first 3 results
  const results = await page.locator('[data-component-type="s-search-result"]').all();
  console.log('Total results:', results.length);

  for (let i = 0; i < Math.min(3, results.length); i++) {
    console.log('\n=== PRODUCT ' + (i + 1) + ' ===');
    const el = results[i];

    const selectors = [
      'h2 a span',
      'h2 span',
      'h2 a.a-link-normal span',
      'h2',
      '.a-text-normal',
      '[data-cy="title-recipe"] a span',
      'span.a-text-normal',
    ];

    for (const sel of selectors) {
      const text = await el.locator(sel).first().textContent().catch(() => null);
      if (text) console.log('  ' + sel + ' -> "' + text.trim().substring(0, 60) + '"');
    }

    const price = await el.locator('.a-price .a-offscreen').first().textContent().catch(() => 'NO PRICE');
    console.log('  price -> ' + price);

    const asin = await el.getAttribute('data-asin').catch(() => 'NO ASIN');
    console.log('  asin -> ' + asin);
  }

  await page.waitForTimeout(10000);
  await browser.close();
})();