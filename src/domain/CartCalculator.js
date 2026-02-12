// src/domain/CartCalculator.js

/**
 * ★ G4 — Cart calculation and verification.
 *
 * Independent calculation of subtotal, tax, and total.
 * Used in checkoutFlow to compare our calculation vs DOM values,
 * ensuring the site's math is correct (or detecting discrepancies).
 *
 * Saucedemo uses an 8% tax rate — configurable via taxRate param.
 */

const DEFAULT_TAX_RATE = 0.08;

/**
 * Calculate cart totals from a list of items.
 *
 * @param {Array<{price: number}>} items — products with price field
 * @param {number} [taxRate=0.08] — tax rate as decimal (8% = 0.08)
 * @returns {{ subtotal: number, tax: number, total: number }}
 */
function calculateCart(items, taxRate = DEFAULT_TAX_RATE) {
  if (!Array.isArray(items)) {
    throw new Error('items must be an array');
  }

  for (const item of items) {
    if (typeof item.price !== 'number' || isNaN(item.price) || item.price < 0) {
      throw new Error(`Invalid item price: ${item.price}`);
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const subtotalRounded = roundTo2(subtotal);

  // Saucedemo rounds tax to 2 decimal places
  const tax = roundTo2(subtotalRounded * taxRate);
  const total = roundTo2(subtotalRounded + tax);

  return { subtotal: subtotalRounded, tax, total };
}

/**
 * Verify DOM values against our calculation.
 *
 * @param {{ subtotal: number, tax: number, total: number }} domValues — parsed from DOM
 * @param {{ subtotal: number, tax: number, total: number }} calculated — our calculation
 * @param {number} [tolerance=0.01] — acceptable rounding difference
 * @returns {{ match: boolean, details: Object }}
 */
function verifyCart(domValues, calculated, tolerance = 0.01) {
  const subtotalMatch = Math.abs(domValues.subtotal - calculated.subtotal) <= tolerance;
  const taxMatch = Math.abs(domValues.tax - calculated.tax) <= tolerance;
  const totalMatch = Math.abs(domValues.total - calculated.total) <= tolerance;

  return {
    match: subtotalMatch && taxMatch && totalMatch,
    expected: calculated,
    actual: domValues,
    details: {
      subtotalMatch,
      taxMatch,
      totalMatch,
    },
  };
}

/**
 * Round a number to 2 decimal places.
 * @param {number} n
 * @returns {number}
 */
function roundTo2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calculateCart, verifyCart, roundTo2 };
