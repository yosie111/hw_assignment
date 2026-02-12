// src/automation/browser/browserFactory.js

const { chromium, firefox } = require('playwright');
const config = require('../config');

/**
 * Launch a Playwright browser with configured settings.
 * Returns { browser, context, page } — caller is responsible for browser.close().
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
