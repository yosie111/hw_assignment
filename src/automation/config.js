// src/automation/config.js

require('dotenv').config();

module.exports = {
  // Saucedemo Site
  SAUCEDEMO_BASE_URL: process.env.SAUCEDEMO_BASE_URL || 'https://www.saucedemo.com',
  SAUCEDEMO_USERNAME: process.env.SAUCEDEMO_USERNAME || 'standard_user',
  SAUCEDEMO_PASSWORD: process.env.SAUCEDEMO_PASSWORD || 'secret_sauce',

  // Amazon Site
  AMAZON_BASE_URL: process.env.AMAZON_BASE_URL || 'https://www.amazon.com',
  AMAZON_USERNAME: process.env.AMAZON_USERNAME || '',
  AMAZON_PASSWORD: process.env.AMAZON_PASSWORD || '',

  // ToolShop Site
  TOOLSHOP_BASE_URL: process.env.TOOLSHOP_BASE_URL || 'https://v4.practicesoftwaretesting.com',
  TOOLSHOP_EMAIL: process.env.TOOLSHOP_EMAIL || 'customer@practicesoftwaretesting.com',
  TOOLSHOP_PASSWORD: process.env.TOOLSHOP_PASSWORD || 'welcome01',

  // Legacy/backward compatibility (defaults to Saucedemo)
  BASE_URL: process.env.BASE_URL ||'https://practicesoftwaretesting.com/',// process.env.SAUCEDEMO_BASE_URL || 'https://www.saucedemo.com',
  USERNAME: process.env.SITE_USERNAME || 'customer@practicesoftwaretesting.com',// process.env.SAUCEDEMO_USERNAME || 'standard_user',
  PASSWORD: process.env.SITE_PASSWORD || 'welcome01',// process.env.SAUCEDEMO_PASSWORD || 'secret_sauce',

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
