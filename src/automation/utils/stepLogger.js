// src/automation/utils/stepLogger.js

/**
 * Wraps each automation step with:
 * - Structured JSON logging (requestId, step, status, durationMs, error)
 * - onStep callback for real-time status updates to Services → API → UI
 *
 * ★ Integration point:
 * Services layer passes onStep callback that saves status to a Map.
 * API layer exposes GET /api/status/:requestId that reads from that Map.
 * UI polls that endpoint to show progress.
 */
function createStepLogger(requestId, onStep) {
  const steps = [];

  return {
    /**
     * Run an async step with logging and status reporting.
     * @param {string} stepName - Name of the step (e.g. 'Login', 'AddToCart')
     * @param {Function} fn - Async function to execute
     * @returns {Promise<*>} Result of fn()
     */
    async runStep(stepName, fn) {
      const start = Date.now();

      // Notify: step started
      const startEvent = {
        requestId,
        step: stepName,
        status: 'running',
        timestamp: new Date().toISOString(),
      };
      if (onStep) onStep(startEvent);

      try {
        const result = await fn();
        const durationMs = Date.now() - start;

        const successEvent = {
          requestId,
          step: stepName,
          status: 'success',
          durationMs,
        };
        console.log(JSON.stringify(successEvent));
        steps.push(successEvent);

        if (onStep) onStep(successEvent);
        return result;

      } catch (error) {
        const durationMs = Date.now() - start;

        const failEvent = {
          requestId,
          step: stepName,
          status: 'failed',
          durationMs,
          error: error.message,
        };
        console.error(JSON.stringify(failEvent));
        steps.push(failEvent);

        if (onStep) onStep(failEvent);
        throw error;
      }
    },

    /** Get all completed steps for summary */
    getSteps() {
      return steps;
    },
  };
}

module.exports = { createStepLogger };
