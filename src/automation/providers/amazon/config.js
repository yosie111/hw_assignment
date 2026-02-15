// src/automation/providers/amazon/config.js
// Amazon platform configuration (placeholder)

require('dotenv').config();

module.exports = {
  platform: 'amazon',
  
  // Site configuration
  baseUrl: process.env.AMAZON_BASE_URL || 'https://www.amazon.com',
  username: process.env.AMAZON_USERNAME || '',
  password: process.env.AMAZON_PASSWORD || '',

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
