const { chromium } = require('playwright');
const config = require('../src/automation/config');
const S = require('../src/automation/sites/amazon/selectors');

(async () => {
  let browser;
  try {
    console.log('=== Amazon Login Debug ===');
    console.log('URL:', config.AMAZON_BASE_URL);
    console.log('Username:', config.AMAZON_USERNAME ? '✅ set' : '❌ EMPTY');
    console.log('Password:', config.AMAZON_PASSWORD ? '✅ set' : '❌ EMPTY');

    // 1. Launch visible browser
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);

    // 2. Navigate
    console.log('\n[1] Navigating to Amazon...');
    await page.goto(config.AMAZON_BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log('    Landed on:', page.url());

    // 3. Screenshot before login
    await page.screenshot({ path: 'screenshots/debug_01_homepage.png' });
    console.log('    📸 Screenshot: debug_01_homepage.png');

    // 4. Click Sign In
    console.log('\n[2] Looking for Sign In link...');
    const signInVisible = await page.locator(S.SIGN_IN_LINK).isVisible();
    console.log('    Sign In visible:', signInVisible);

    if (signInVisible) {
      await page.locator(S.SIGN_IN_LINK).click();
      await page.waitForTimeout(3000);
    }

    console.log('    URL after click:', page.url());
    await page.screenshot({ path: 'screenshots/debug_02_after_signin_click.png' });
    console.log('    📸 Screenshot: debug_02_after_signin_click.png');

    // 5. Check email field
    console.log('\n[3] Looking for Email input (#ap_email)...');
    const emailVisible = await page.locator(S.EMAIL_INPUT).isVisible().catch(() => false);
    console.log('    Email input visible:', emailVisible);

    if (emailVisible) {
      await page.locator(S.EMAIL_INPUT).fill(config.AMAZON_USERNAME);
      console.log('    ✅ Email filled');

      // Click Continue
      const continueVisible = await page.locator(S.CONTINUE_BUTTON).isVisible().catch(() => false);
      console.log('    Continue button visible:', continueVisible);

      if (continueVisible) {
        await page.locator(S.CONTINUE_BUTTON).click();
        await page.waitForTimeout(3000);
      }
    } else {
      console.log('    ❌ Email input NOT found! Dumping page selectors...');
      // Print what IS on the page
      const inputs = await page.locator('input').count();
      console.log('    Total <input> elements on page:', inputs);
      for (let i = 0; i < Math.min(inputs, 10); i++) {
        const id = await page.locator('input').nth(i).getAttribute('id');
        const name = await page.locator('input').nth(i).getAttribute('name');
        const type = await page.locator('input').nth(i).getAttribute('type');
        console.log(`    input[${i}]: id="${id}" name="${name}" type="${type}"`);
      }
    }

    console.log('    URL now:', page.url());
    await page.screenshot({ path: 'screenshots/debug_03_after_email.png' });
    console.log('    📸 Screenshot: debug_03_after_email.png');

    // 6. Check password field
    console.log('\n[4] Looking for Password input (#ap_password)...');
    const passVisible = await page.locator(S.PASSWORD_INPUT).isVisible().catch(() => false);
    console.log('    Password input visible:', passVisible);

    if (!passVisible) {
      console.log('    ❌ PASSWORD NOT VISIBLE — this is your error!');
      console.log('    Possible causes:');
      console.log('    - CAPTCHA blocking');
      console.log('    - Redirect to different domain');
      console.log('    - Email step failed silently');
      console.log('    - Amazon bot detection');

      // Check for CAPTCHA
      const captcha = await page.locator('img#auth-captcha-image').isVisible().catch(() => false);
      console.log('    CAPTCHA present:', captcha);
    } else {
      await page.locator(S.PASSWORD_INPUT).fill(config.AMAZON_PASSWORD);
      console.log('    ✅ Password filled');
    }

    await page.screenshot({ path: 'screenshots/debug_04_password_step.png' });
    console.log('    📸 Screenshot: debug_04_password_step.png');

    // Keep browser open for manual inspection
    console.log('\n=== Browser stays open for 30s — inspect manually ===');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    if (browser) await browser.close();
    console.log('🔒 Browser closed.');
  }
})();