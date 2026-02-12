// src/automation/utils/retry.js

const config = require('../config');

/**
 * Retry an async function with exponential backoff.
 * Default delays: 500ms → 1000ms → 2000ms
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} opts
 * @param {string} [opts.label] - Step name for error messages
 * @param {number} [opts.maxAttempts] - Override config default (3)
 * @returns {Promise<*>} Result of fn()
 * @throws {Error} After all attempts exhausted
 */
async function withRetry(fn, { maxAttempts, label } = {}) {
  const max = maxAttempts || config.RETRY_MAX_ATTEMPTS;
  const baseDelay = config.RETRY_BASE_DELAY_MS;

  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === max) {
        throw new Error(
          `[${label || 'action'}] Failed after ${max} attempts: ${error.message}`
        );
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

module.exports = { withRetry };
