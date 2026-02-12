// src/automation/utils/screenshot.js

const path = require('path');
const fs = require('fs');
const config = require('../config');

/**
 * Save a full-page screenshot with requestId + timestamp.
 * Used for both success proof and error debugging.
 *
 * @param {import('playwright').Page} page
 * @param {string} requestId - Unique identifier for this run
 * @returns {Promise<string>} Full path to saved screenshot
 */
async function takeScreenshot(page, requestId) {
  const dir = config.SCREENSHOTS_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `proof_${requestId}_${timestamp}.png`;
  const filepath = path.join(dir, filename);

  await page.screenshot({ path: filepath, fullPage: true });

  return filepath;
}

module.exports = { takeScreenshot };
