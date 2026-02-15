// src/automation/providers/saucedemo/browser.js
// Saucedemo-specific browser management

const { BrowserManager } = require('../../core/browser-manager');
const config = require('./config');

/**
 * Create a browser manager instance for Saucedemo
 * @returns {BrowserManager}
 */
function createSaucedemosBrowser() {
  return new BrowserManager(config.browser);
}

module.exports = { createSaucedemosBrowser };
