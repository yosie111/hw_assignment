// src/automation/config.js

require('dotenv').config();

module.exports = {
  // Site
  BASE_URL: process.env.BASE_URL || 'https://www.saucedemo.com',
  USERNAME: process.env.SITE_USERNAME || 'standard_user',
  PASSWORD: process.env.SITE_PASSWORD || 'secret_sauce',

  // Browser
  HEADLESS: process.env.HEADLESS !== 'false',         // default: true
  DEFAULT_TIMEOUT: 10_000,                             // 10s per action
  NAVIGATION_TIMEOUT: 35_000,                          // 3.5s per navigation

  // Retry
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 500,                            // 500ms → 1000ms → 2000ms

  // Paths
  SCREENSHOTS_DIR: process.env.SCREENSHOTS_DIR || './screenshots',

  // Tax — default 0%. Override via .env (e.g. TAX_RATE=0.08 for 8%)
  TAX_RATE: parseFloat(process.env.TAX_RATE) || 0,
};
