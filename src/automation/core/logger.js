// src/automation/core/logger.js
// Unified logging for the automation framework

/**
 * Simple logger for automation operations
 */
class Logger {
  constructor(prefix = '') {
    this.prefix = prefix;
  }

  info(message, ...args) {
    console.log(`[INFO]${this.prefix ? ' ' + this.prefix : ''}: ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[ERROR]${this.prefix ? ' ' + this.prefix : ''}: ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[WARN]${this.prefix ? ' ' + this.prefix : ''}: ${message}`, ...args);
  }

  debug(message, ...args) {
    if (process.env.DEBUG === 'true') {
      console.debug(`[DEBUG]${this.prefix ? ' ' + this.prefix : ''}: ${message}`, ...args);
    }
  }

  step(stepName, status = 'started') {
    this.info(`Step: ${stepName} - ${status}`);
  }
}

/**
 * Create a logger instance with optional prefix
 * @param {string} prefix - Optional prefix for log messages
 * @returns {Logger}
 */
function createLogger(prefix = '') {
  return new Logger(prefix);
}

module.exports = { Logger, createLogger };
