// src/automation/utils/screenshot.js

const path = require('path');
const fs = require('fs');
const config = require('../config');

/**
 * Save a full-page screenshot with requestId, step name, and timestamp.
 * Used for proof at multiple stages and error debugging.
 *
 * @param {import('playwright').Page} page
 * @param {string} requestId - Unique identifier for this run
 * @param {string} [step='proof'] - Step name (e.g. 'product-selected', 'cart', 'checkout')
 * @returns {Promise<string>} Full path to saved screenshot
 */
async function takeScreenshot(page, requestId, step = 'proof') {
  const dir = config.SCREENSHOTS_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${step}_${requestId}_${timestamp}.png`;
  const filepath = path.join(dir, filename);

  await page.screenshot({ path: filepath, fullPage: true });

  return filepath;
}

module.exports = { takeScreenshot };
