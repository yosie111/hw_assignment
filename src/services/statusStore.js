// src/services/statusStore.js
//
// In-Memory State Pattern — Map with TTL
// Manages real-time status of search/purchase operations.
//
// Design decisions (from research docs):
//   - O(1) lookup via Map (frequent polling from UI)
//   - TTL 30 min prevents memory leaks in long-running Node.js server
//   - Node.js single-threaded → no mutex/lock needed
//   - Production: would be replaced by Redis + BullMQ for distributed state

const store = new Map();
const TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Create a new status entry for a request.
 * @param {string} requestId - UUID identifier
 * @param {'search'|'purchase'} type - operation type
 * @returns {Object} the created entry
 */
function create(requestId, type) {
  const entry = {
    requestId,
    type,
    status: 'running',
    currentStep: null,
    steps: [],
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.set(requestId, entry);

  // TTL — automatic cleanup (critical for preventing memory leaks)
  // .unref() ensures this timer won't keep Node.js process alive
  const timer = setTimeout(() => store.delete(requestId), TTL_MS);
  if (timer.unref) timer.unref();

  return entry;
}

/**
 * Update the current step for a running request.
 * Called by automation's onStep callback (Observer pattern).
 * @param {string} requestId
 * @param {Object} event - { step, status, durationMs?, error? }
 */
function updateStep(requestId, event) {
  const entry = store.get(requestId);
  if (!entry) return;

  entry.currentStep = event.step;
  entry.steps.push({
    step: event.step,
    status: event.status,
    durationMs: event.durationMs || null,
    error: event.error || null,
    timestamp: new Date().toISOString(),
  });
  entry.updatedAt = new Date().toISOString();
}

/**
 * Mark a request as completed with its result.
 * @param {string} requestId
 * @param {Object} result - { count } for search, Order for purchase
 */
function complete(requestId, result) {
  const entry = store.get(requestId);
  if (!entry) return;

  entry.status = 'completed';
  entry.result = result;
  entry.updatedAt = new Date().toISOString();
}

/**
 * Mark a request as failed.
 * @param {string} requestId
 * @param {string} errorMessage
 */
function fail(requestId, errorMessage) {
  const entry = store.get(requestId);
  if (!entry) return;

  entry.status = 'failed';
  entry.error = errorMessage;
  entry.updatedAt = new Date().toISOString();
}

/**
 * Get status entry by requestId.
 * @param {string} requestId
 * @returns {Object|null}
 */
function get(requestId) {
  return store.get(requestId) || null;
}

/**
 * Get all active status entries.
 * @returns {Object[]}
 */
function getAll() {
  return Array.from(store.values());
}

/**
 * Clear all entries (for testing).
 */
function _clear() {
  store.clear();
}

/**
 * Get store size (for testing).
 */
function _size() {
  return store.size;
}

module.exports = { create, updateStep, complete, fail, get, getAll, _clear, _size };
