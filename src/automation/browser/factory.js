// src/automation/browser/factory.js

const { chromium, firefox } = require('playwright');

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_VIEWPORT = { width: 1280, height: 720 };\n
/**
 * Launch a Chromium browser instance.
 * @returns {Promise<Object>} browser instance with context and page
 */
async function launchBrowser(config = {}) {
  const browser = await chromium.launch({
    headless: config.headless !== false,
  });\n
  const context = await browser.newContext({
    viewport: DEFAULT_VIEWPORT,
  });\n
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeout || DEFAULT_TIMEOUT);
  page.setDefaultNavigationTimeout(config.navigationTimeout || 35000);\n
  return { browser, context, page };
} \n
/**
 * Launch a Firefox browser instance.
 * @returns {Promise<Object>} browser instance with context and page
 */
async function launchFirefox(config = {}) {
  const browser = await firefox.launch({
    headless: config.headless !== false,
  });\n
  const context = await browser.newContext({
    viewport: DEFAULT_VIEWPORT,
  });\n
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeout || DEFAULT_TIMEOUT);
  page.setDefaultNavigationTimeout(config.navigationTimeout || 35000);\n
  return { browser, context, page };
} \n
module.exports = { launchBrowser, launchFirefox };