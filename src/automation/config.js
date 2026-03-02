// src/automation/config.js
//
// Centralized configuration — all values from environment variables.
//
// ★ BUG FIX: Removed hardcoded fallback credentials.
//   Before: process.env.X || 'secret_sauce' — leaked passwords in Git history.
//   After: process.env.X || '' — fails explicitly if .env missing.
//
// ★ BUG FIX: Removed legacy BASE_URL/USERNAME/PASSWORD fields.

require('dotenv').config();

function requireEnv(key, fallback) {
  const value = process.env[key];
  if (value) return value;
  if (fallback !== undefined) return fallback;
  console.warn(`[config] Missing env var: ${key} — using empty string`);
  return '';
}

module.exports = {
  // Saucedemo Site
  SAUCEDEMO_BASE_URL: requireEnv('SAUCEDEMO_BASE_URL', 'https://www.saucedemo.com'),
  SAUCEDEMO_USERNAME: requireEnv('SAUCEDEMO_USERNAME'),
  SAUCEDEMO_PASSWORD: requireEnv('SAUCEDEMO_PASSWORD'),

  // Amazon Site
  AMAZON_BASE_URL: requireEnv('AMAZON_BASE_URL', 'https://www.amazon.com'),
  AMAZON_USERNAME: requireEnv('AMAZON_USERNAME'),
  AMAZON_PASSWORD: requireEnv('AMAZON_PASSWORD'),

  // ToolShop Site
  TOOLSHOP_BASE_URL: requireEnv('TOOLSHOP_BASE_URL', 'https://practicesoftwaretesting.com'),
  TOOLSHOP_EMAIL: requireEnv('TOOLSHOP_EMAIL'),
  TOOLSHOP_PASSWORD: requireEnv('TOOLSHOP_PASSWORD'),

  // Browser
  HEADLESS: process.env.HEADLESS !== 'false',         // default: true
  DEFAULT_TIMEOUT: 10_000,                             // 10s per action
  NAVIGATION_TIMEOUT: 35_000,                          // 35s per navigation

  // Retry
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 500,                            // 500ms → 1000ms → 2000ms

  // Paths
  SCREENSHOTS_DIR: process.env.SCREENSHOTS_DIR || './screenshots',

  // Tax — default 0%. Override via .env (e.g. TAX_RATE=0.08 for 8%)
  TAX_RATE: parseFloat(process.env.TAX_RATE) || 0,
};
