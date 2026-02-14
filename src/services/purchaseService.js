// src/services/purchaseService.js
//
// Async Purchase Service — Fire-and-Forget with Polling
//
// Design Patterns:
//   - Fire-and-Forget: executePurchase returns requestId immediately (HTTP 202)
//   - _runPurchase runs in background — UI polls GET /api/status/:requestId
//   - Reconciliation: Oracle calc vs DOM totalText (warn on mismatch, never block)
//   - Aggregate (DDD): Order collects all purchase data into single frozen object
//   - Defensive Programming: mismatch/validation errors = warn, not crash
//
// Flow:
//   executePurchase({ product, shipping })
//     → validate inputs (Fail Fast)
//     → uuid() → statusStore.create()
//     → _runPurchase() (NO AWAIT — fire and forget)
//     → return { requestId } immediately
//
//   _runPurchase() (background):
//     → automation.purchase()
//     → Oracle validation (calculateCart vs DOM total)
//     → createOrder() (DDD Aggregate, frozen)
//     → statusStore.complete(requestId, order)

const { randomUUID } = require('crypto');
const { purchase } = require('../automation');
const { createOrder } = require('../domain/Order');
const { calculateCart, validateCartTotal, DEFAULT_TAX_RATE } = require('../domain/CartCalculator');
const statusStore = require('./statusStore');

// Tax rate — configurable per region. Default: 0%.
const TAX_RATE = parseFloat(process.env.TAX_RATE) || DEFAULT_TAX_RATE;

/**
 * Start async purchase — returns requestId immediately (202 Accepted).
 *
 * @param {Object} params
 * @param {Object} params.product - frozen Product (must have .title and .price)
 * @param {Object} params.shipping - { firstName, lastName, postalCode }
 * @returns {{ requestId: string }}
 * @throws {Error} if product or shipping invalid (Fail Fast)
 */
async function executePurchase({ product, shipping }) {
  // Fail Fast — validate before spending resources
  if (!product || !product.title) {
    throw new Error('Valid product with title is required for purchase');
  }
  if (!shipping || !shipping.firstName || !shipping.lastName || !shipping.postalCode) {
    throw new Error('Complete shipping details required (firstName, lastName, postalCode)');
  }

  const requestId = randomUUID();
  statusStore.create(requestId, 'purchase');

  // Fire and Forget — return requestId immediately
  _runPurchase({ product, shipping, requestId }).catch((err) => {
    console.error(`[${requestId}] Unhandled purchase error:`, err.message);
  });

  return { requestId };
}

/**
 * Background purchase execution (not awaited by API).
 * UI polls GET /api/status/:requestId to track progress.
 * @private
 */
async function _runPurchase({ product, shipping, requestId }) {
  try {
    // Automation — browser does the actual purchase
    const result = await purchase({
      productTitle: product.title,
      shipping,
      requestId,
      onStep: (event) => statusStore.updateStep(requestId, event),
    });

    // Automation returned failure
    if (result.status === 'failed') {
      createOrder({
        requestId,
        product,
        shipping,
        status: 'failed',
        error: result.error,
        screenshots: result.screenshotPath ? [result.screenshotPath] : [],
        steps: result.steps || [],
        cartValidation: null,
      });
      statusStore.fail(requestId, result.error);
      return;
    }

    // Oracle Validation (Reconciliation Pattern)
    let cartValidation = null;
    try {
      const calc = calculateCart([product], { taxRate: TAX_RATE });
      const validation = validateCartTotal(calc.total, result.totalText);

      cartValidation = {
        breakdown: {
          subtotal: calc.subtotal,
          tax: calc.tax,
          total: calc.total,
        },
        fromSite: validation.fromSite,
        match: validation.match,
      };

      if (!validation.match) {
        console.warn(
          `[${requestId}] Cart total mismatch: ` +
          `Oracle=$${calc.total}, Site=$${validation.fromSite} ` +
          `(diff=$${Math.abs(calc.total - validation.fromSite).toFixed(2)})`
        );
      }
    } catch (err) {
      console.warn(`[${requestId}] Cart validation skipped: ${err.message}`);
    }

    // Collect ALL screenshots (cart + checkout)
    const allScreenshots = [
      ...(result.cartScreenshots || []),
      ...(result.screenshots || []),
    ];

    // DDD Aggregate — Order collects everything into frozen object
    const order = createOrder({
      requestId,
      product,
      shipping,
      status: 'completed',
      confirmText: result.confirmText,
      totalText: result.totalText,
      screenshots: allScreenshots,
      steps: result.steps || [],
      cartValidation,
    });

    statusStore.complete(requestId, order);

  } catch (error) {
    statusStore.fail(requestId, error.message);
  }
}

/**
 * Get status of a purchase operation.
 * @param {string} requestId
 * @returns {Object|null} status entry
 */
function getStatus(requestId) {
  return statusStore.get(requestId);
}

module.exports = { executePurchase, getStatus, _runPurchase };
