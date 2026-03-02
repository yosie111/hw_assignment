// src/domain/OrderResult.js
//
// OrderResult — Factory Function + Object.freeze()
// Consistent with Product.js, Cart.js, Order.js design pattern.
//
// ★ BUG FIX: Converted from Class to Factory Function.
//   Before: Class with `new`, `this`, mutable properties.
//   After: createOrderResult() → validated, frozen, immutable.

const VALID_STATUSES = ['completed', 'failed'];

/**
 * Create an immutable OrderResult domain object.
 *
 * @param {Object} data
 * @param {string}  data.status           - 'completed' | 'failed'
 * @param {string}  data.requestId        - UUID of the automation run
 * @param {string}  [data.lastStep]       - Last step reached
 * @param {string}  [data.screenshotPath] - Path to proof screenshot
 * @param {string}  [data.error]          - Error message if failed
 * @param {Object}  [data.cartVerification] - Oracle cart match result
 * @returns {Object} Frozen OrderResult
 * @throws {Error} if status or requestId invalid
 */
function createOrderResult({ status, lastStep, requestId, screenshotPath, error, cartVerification }) {
  if (!status || !VALID_STATUSES.includes(status)) {
    throw new Error(`OrderResult status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (!requestId || typeof requestId !== 'string') {
    throw new Error('OrderResult requestId is required');
  }

  return Object.freeze({
    status,
    lastStep: lastStep || null,
    requestId,
    screenshotPath: screenshotPath || null,
    error: error || null,
    cartVerification: cartVerification || null,
    isSuccess: status === 'completed',
  });
}

// ★ Backward-compatible: OrderResult.create() still works
const OrderResult = {
  create: createOrderResult,
};

module.exports = { OrderResult, createOrderResult };
