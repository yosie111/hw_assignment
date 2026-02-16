const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const config = require('../src/automation/config');
const S = require('../src/automation/sites/amazon/selectors');

(async () => {
  let browser;
  try {
    console.log('=== Amazon Stealth Login Test ===\n');

    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      locale: 'en-US',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);

    // 1. Navigate
    console.log('[1] Navigating...');
    await page.goto(config.AMAZON_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('    URL:', page.url());

    // 2. Click Sign In
    console.log('[2] Clicking Sign In...');
    await page.locator(S.SIGN_IN_LINK).click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/stealth_01_signin_page.png' });
    console.log('    URL:', page.url());

    // 3. Check email
    console.log('[3] Looking for #ap_email...');
    const emailVisible = await page.locator(S.EMAIL_INPUT).isVisible().catch(() => false);
    console.log('    Email visible:', emailVisible);

    if (emailVisible) {
      await page.locator(S.EMAIL_INPUT).fill(config.AMAZON_USERNAME);
      await page.locator(S.CONTINUE_BUTTON).click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'screenshots/stealth_02_after_email.png' });

      // 4. Check password
      console.log('[4] Looking for #ap_password...');
      const passVisible = await page.locator(S.PASSWORD_INPUT).isVisible().catch(() => false);
      console.log('    Password visible:', passVisible);

      if (passVisible) {
        await page.locator(S.PASSWORD_INPUT).fill(config.AMAZON_PASSWORD);
        await page.locator(S.SIGN_IN_BUTTON).click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'screenshots/stealth_03_after_login.png' });
        console.log('    ✅ Login flow completed! URL:', page.url());
      }
    } else {
      console.log('    ❌ Still blocked. Dumping visible elements...');
      const allVisible = await page.locator('input:visible, button:visible, a:visible').count();
      console.log('    Visible interactive elements:', allVisible);
      await page.screenshot({ path: 'screenshots/stealth_01_blocked.png' });
    }

    console.log('\n=== Browser open 60s for inspection ===');
    await page.waitForTimeout(60000);
  } catch (e) {
    console.error('❌', e.message);
  } finally {
    if (browser) await browser.close();
  }
})();

