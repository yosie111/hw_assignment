// src/services/purchaseService.js
//
// Async Purchase Service — Fire-and-Forget with Polling
//
// ★ DI Change: adapter is injected by the caller (route handler),
//   NOT created inside this module. The adapter is passed through to
//   _runPurchase which runs in the background.
//
// Design Patterns:
//   - DI (Dependency Injection): adapter comes from outside
//   - Fire-and-Forget: executePurchase returns requestId immediately (HTTP 202)
//   - _runPurchase runs in background — UI polls GET /api/status/:requestId
//   - Reconciliation: Oracle calc vs DOM totalText (warn on mismatch, never block)
//   - Aggregate (DDD): Order collects all purchase data into single frozen object
//   - Defensive Programming: mismatch/validation errors = warn, not crash
//
// Flow:
//   executePurchase(adapter, { product, shipping })
//     → validate inputs (Fail Fast)
//     → uuid() → statusStore.create()
//     → _runPurchase(adapter, ...) (NO AWAIT — fire and forget)
//     → return { requestId } immediately
//
//   _runPurchase(adapter, ...) (background):
//     → adapter.purchase()
//     → Oracle validation (calculateCart vs DOM total)
//     → createOrder() (DDD Aggregate, frozen)
//     → statusStore.complete(requestId, order)

const { randomUUID } = require('crypto');
const { createOrder } = require('../domain/Order');
const { calculateCart, EPSILON } = require('../domain/CartCalculator');
const statusStore = require('./statusStore');

// Tax rate — single source: config.js (reads from .env)
const { TAX_RATE } = require('../automation/config');

/**
 * Start async purchase — returns requestId immediately (202 Accepted).
 *
 * @param {SiteAdapter} adapter - Injected adapter (SauceDemoAdapter, FakeAdapter, …)
 * @param {Object} params
 * @param {Object} params.product - frozen Product (must have .title and .price)
 * @param {Object} params.shipping - { firstName, lastName, postalCode }
 * @returns {{ requestId: string }}
 * @throws {Error} if product or shipping invalid (Fail Fast)
 */
async function executePurchase(adapter, { product, shipping }) {
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
  // ★ adapter is captured in the closure — no global state
  _runPurchase(adapter, { product, shipping, requestId }).catch((err) => {
    console.error(`[${requestId}] Unhandled purchase error:`, err.message);
  });

  return { requestId };
}

/**
 * Background purchase execution (not awaited by API).
 * UI polls GET /api/status/:requestId to track progress.
 *
 * @param {SiteAdapter} adapter - Same adapter instance passed from executePurchase
 * @param {Object} params
 * @private
 */
async function _runPurchase(adapter, { product, shipping, requestId }) {
  try {
    // ★ Adapter call — adapter handles browser, login, cart, checkout
    const result = await adapter.purchase({
      productTitle: product.title,
      shipping,
      requestId,
      onStep: (event) => statusStore.updateStep(requestId, event),
    });

    // Automation returned failure (graceful — error screenshot taken)
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
      statusStore.fail(requestId, result.error, {
        failedStep: result.steps?.slice(-1)[0]?.step || 'unknown',
        screenshots: result.screenshotPath ? [result.screenshotPath] : [],
      });
      return;
    }

    // Oracle Validation (Reconciliation Pattern)
    // Compare Oracle subtotal vs Site subtotal
    let cartValidation = null;
    try {
      const calc = calculateCart([product], { taxRate: TAX_RATE });

      // Parse site values (subtotal, tax, total) from DOM text
      const parsePrice = (text) => parseFloat((text || '').replace(/[^0-9.]/g, ''));
      const siteSubtotal = parsePrice(result.subtotalText);
      const siteTax = parsePrice(result.taxText);
      const siteTotal = parsePrice(result.totalText);

      // Match = Oracle subtotal equals Site subtotal (tax-independent)
      const match = !isNaN(siteSubtotal)
        ? Math.abs(calc.subtotal - siteSubtotal) <= EPSILON
        : false;

      cartValidation = {
        breakdown: {
          subtotal: calc.subtotal,
          tax: calc.tax,
          total: calc.total,
        },
        site: {
          subtotal: isNaN(siteSubtotal) ? null : siteSubtotal,
          tax: isNaN(siteTax) ? null : siteTax,
          total: isNaN(siteTotal) ? null : siteTotal,
        },
        fromSite: isNaN(siteTotal) ? 0 : siteTotal,
        match,
      };

      if (!match) {
        console.warn(
          `[${requestId}] Cart subtotal mismatch: ` +
          `Oracle=$${calc.subtotal}, Site=$${siteSubtotal} ` +
          `(diff=$${Math.abs(calc.subtotal - (siteSubtotal || 0)).toFixed(2)})`
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
      subtotalText: result.subtotalText,
      taxText: result.taxText,
      totalText: result.totalText,
      screenshots: allScreenshots,
      steps: result.steps || [],
      cartValidation,
    });

    statusStore.complete(requestId, order);

  } catch (error) {
    statusStore.fail(requestId, error.message, {
      failedStep: 'purchase-flow',
    });
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
