// src/automation/providers/saucedemo/config.js
// Saucedemo platform configuration

require('dotenv').config();

module.exports = {
  platform: 'saucedemo',
  
  // Site configuration
  baseUrl: process.env.BASE_URL || 'https://www.saucedemo.com',
  username: process.env.SITE_USERNAME || 'standard_user',
  password: process.env.SITE_PASSWORD || 'secret_sauce',

  // Browser configuration
  browser: {
    headless: process.env.HEADLESS !== 'false',
    defaultTimeout: 10000,
    navigationTimeout: 35000,
    viewport: { width: 1280, height: 720 },
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    baseDelayMs: 500,
  },

  // Screenshots
  screenshotsDir: process.env.SCREENSHOTS_DIR || './screenshots',
};
