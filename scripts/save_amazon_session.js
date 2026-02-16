const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const path = require('path');
const STORAGE_PATH = path.join(__dirname, '..', 'amazon-session.json');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  await page.goto('https://www.amazon.com');

  console.log('=== התחבר ידנית לאמזון בדפדפן שנפתח ===');
  console.log('=== פתור CAPTCHA אם יש ===');
  console.log('=== כשתסיים ותראה את דף הבית — לחץ Enter כאן ===\n');

  await new Promise(resolve => process.stdin.once('data', resolve));

  // Save session cookies
  await context.storageState({ path: STORAGE_PATH });
  console.log(`\n✅ Session saved to: ${STORAGE_PATH}`);

  await browser.close();
})();