// src/automation/browser/browserFactory.js

const { chromium, firefox } = require('playwright');
const config = require('../config');

/**
 * Launch Chromium browser (default).
 * @returns {Promise<{ browser, context, page }>}
 */
async function launchBrowser() {
  const browser = await chromium.launch({
    headless: config.HEADLESS,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(config.DEFAULT_TIMEOUT);
  page.setDefaultNavigationTimeout(config.NAVIGATION_TIMEOUT);

  return { browser, context, page };
}

/**
 * Launch Firefox browser.
 * Install first: npx playwright install firefox
 * @returns {Promise<{ browser, context, page }>}
 */
async function launchFirefox() {
  const browser = await firefox.launch({
    headless: config.HEADLESS,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(config.DEFAULT_TIMEOUT);
  page.setDefaultNavigationTimeout(config.NAVIGATION_TIMEOUT);

  return { browser, context, page };
}

module.exports = { launchBrowser, launchFirefox };
