// src/domain/CartCalculator.js
// Oracle Pattern — independent tax calculation (default: 0%, configurable via config.js)
// IEEE 754 fix with Math.round
// (Built in previous session, this is the interface stub for Services integration)

// ★ DEFAULT_TAX_RATE = 0 (by design)
// The Oracle uses the rate from config.js (TAX_RATE env var), NOT this default.
// This default only applies if no taxRate is passed to calculateCart().
// Saucedemo uses 8% (set TAX_RATE=0.08 in .env), ToolShop calculates its own.
// A zero default is safe: it means "no tax" unless explicitly configured.
const DEFAULT_TAX_RATE = 0;
const EPSILON = 0.02;

/**
 * Parse a price from DOM text like "Item total: $7.99" or "Total: $8.63".
 * Strips all non-numeric/non-dot characters and returns a float.
 *
 * ★ Extracted from purchaseService._runPurchase() to avoid code duplication.
 *   Both services and CartCalculator.validateCartTotal use the same logic.
 *
 * @param {string} text - DOM text containing a price (e.g. "Total: $8.63")
 * @returns {number} Parsed price, or NaN if text is empty/unparsable
 */
function parsePrice(text) {
  return parseFloat((text || '').replace(/[^0-9.]/g, ''));
}

function calculateCart(products, { taxRate = DEFAULT_TAX_RATE } = {}) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('Products array must not be empty');
  }

  const subtotal = products.reduce((sum, p) => sum + p.price, 0);
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const tax = Math.round(roundedSubtotal * taxRate * 100) / 100;
  const total = Math.round((roundedSubtotal + tax) * 100) / 100;

  return Object.freeze({ subtotal: roundedSubtotal, tax, total });
}

function validateCartTotal(calculatedTotal, domTotalText) {
  if (typeof calculatedTotal !== 'number') {
    throw new Error('calculatedTotal must be a number');
  }
  if (typeof domTotalText !== 'string') {
    throw new Error('domTotalText must be a string');
  }

  const fromSite = parsePrice(domTotalText);
  if (isNaN(fromSite)) {
    throw new Error(`Cannot parse site total from: "${domTotalText}"`);
  }

  const match = Math.abs(calculatedTotal - fromSite) <= EPSILON;

  return Object.freeze({ match, calculated: calculatedTotal, fromSite });
}

module.exports = { calculateCart, validateCartTotal, parsePrice, DEFAULT_TAX_RATE, EPSILON };
