// src/automation/browser/browserFactory.js

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const path = require('path');
const fs = require('fs');
const config = require('../config');

const AMAZON_SESSION_PATH = path.join(__dirname, '../../../amazon-session.json');

/**
 * Launch Chromium browser with stealth plugin.
 * @param {Object} [options]
 * @param {boolean} [options.useAmazonSession] - Load saved Amazon session cookies
 * @returns {Promise<{ browser, context, page }>}
 */
async function launchBrowser(options = {}) {
  const browser = await chromium.launch({
    headless: config.HEADLESS,
  });

  const contextOptions = {
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'en-US',
  };

  // Load saved Amazon session if available and requested
  if (options.useAmazonSession && fs.existsSync(AMAZON_SESSION_PATH)) {
    contextOptions.storageState = AMAZON_SESSION_PATH;
    console.log('Loaded saved Amazon session');
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.setDefaultTimeout(config.DEFAULT_TIMEOUT);
  page.setDefaultNavigationTimeout(config.NAVIGATION_TIMEOUT);

  // Automatically dismiss unexpected browser dialogs (e.g. IDM registration popups,
  // alert() calls). None of the automated flows intentionally trigger dialogs,
  // so any dialog that appears is an interruption that should be dismissed.
  page.on('dialog', async (dialog) => {
    console.log(`Auto-dismissing dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });

  return { browser, context, page };
}

module.exports = { launchBrowser };