// src/automation/providers/amazon/browser.js
// Amazon-specific browser management

const { BrowserManager } = require('../../core/browser-manager');
const config = require('./config');

/**
 * Create a browser manager instance for Amazon
 * @returns {BrowserManager}
 */
function createAmazonBrowser() {
  return new BrowserManager(config.browser);
}

module.exports = { createAmazonBrowser };
