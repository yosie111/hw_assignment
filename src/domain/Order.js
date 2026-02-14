// src/domain/Order.js

/**
 * Order — immutable result of a purchase flow (success or failure).
 *
 * ★ Design decisions (per research doc):
 *   - "Historical" object — once created, never changes
 *   - Object.freeze → prevents accidental mutation
 *   - requestId is REQUIRED — critical for Observability/traceability
 *   - screenshots + steps = built-in test report (not just business data)
 *   - cartValidation = Oracle breakdown for UI display
 *   - createdAt timestamp for audit trail
 *
 * @param {Object} data
 * @returns {Readonly<Order>} Frozen order result
 * @throws {Error} If requestId or status is missing
 */
function createOrder({
  requestId,
  product,
  shipping,
  status,
  confirmText,
  subtotalText,
  taxText,
  totalText,
  screenshots,
  steps,
  error,
  cartValidation,
}) {
  // ★ Fail Fast — requestId is critical for traceability
  if (!requestId) throw new Error('Order requestId is required');
  if (!status) throw new Error('Order status is required');

  // ★ Object.freeze — Order is historical, immutable
  return Object.freeze({
    requestId,
    product: product || null,
    shipping: shipping || null,
    status,
    confirmText: confirmText || null,
    subtotalText: subtotalText || null,
    taxText: taxText || null,
    totalText: totalText || null,
    screenshots: Object.freeze(screenshots || []),
    steps: Object.freeze(steps || []),
    error: error || null,
    cartValidation: cartValidation ? Object.freeze(cartValidation) : null,
    createdAt: new Date().toISOString(),
  });
}

module.exports = { createOrder };
