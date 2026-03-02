// src/automation/config.js

require('dotenv').config();

module.exports = {
  // ─── Saucedemo ───────────────────────────────────────────
  SAUCEDEMO_BASE_URL: process.env.SAUCEDEMO_BASE_URL || 'https://www.saucedemo.com',
  SAUCEDEMO_USERNAME: process.env.SAUCEDEMO_USERNAME || 'standard_user',
  SAUCEDEMO_PASSWORD: process.env.SAUCEDEMO_PASSWORD || 'secret_sauce',

  // ─── Amazon (experimental — blocked by anti-bot) ─────────
  AMAZON_BASE_URL: process.env.AMAZON_BASE_URL || 'https://www.amazon.com',
  AMAZON_USERNAME: process.env.AMAZON_USERNAME || '',
  AMAZON_PASSWORD: process.env.AMAZON_PASSWORD || '',

  // ─── ToolShop ────────────────────────────────────────────
  TOOLSHOP_BASE_URL: process.env.TOOLSHOP_BASE_URL || 'https://practicesoftwaretesting.com',
  TOOLSHOP_EMAIL: process.env.TOOLSHOP_EMAIL || 'customer@practicesoftwaretesting.com',
  TOOLSHOP_PASSWORD: process.env.TOOLSHOP_PASSWORD || 'welcome01',

  // ─── Browser ─────────────────────────────────────────────
  HEADLESS: process.env.HEADLESS !== 'false',         // default: true
  DEFAULT_TIMEOUT: 10_000,                             // 10s per action
  NAVIGATION_TIMEOUT: 35_000,                          // 35s per navigation

  // ─── Retry ───────────────────────────────────────────────
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 500,                            // 500ms → 1s → 2s (exponential)

  // ─── Paths ───────────────────────────────────────────────
  SCREENSHOTS_DIR: process.env.SCREENSHOTS_DIR || './screenshots',

  // ─── Tax ─────────────────────────────────────────────────
  // Default 0%. Override via .env (e.g. TAX_RATE=0.08 for 8%)
  TAX_RATE: parseFloat(process.env.TAX_RATE) || 0,
};
