// src/domain/cartCalculator.js

/**
 * Cart Calculator — The Oracle (independent source of truth).
 *
 * ★ Core concept from research doc:
 * This module does NOT "ask" the browser what the total is.
 * It CALCULATES what the total SHOULD be.
 * When automation compares this vs the site's DOM value,
 * it performs REAL validation of the site's business logic.
 *
 * ★ Key design decisions:
 *   - Pure Functions — same input = same output, no side effects
 *   - Subtotal Tax (not Line-Item Tax) — matches Saucedemo behavior
 *   - Math.round(value * 100) / 100 — IEEE 754 floating point fix
 *   - Epsilon Tolerance 0.02 — handles Banker's Rounding differences
 */

const TAX_RATE = 0.08; // Saucedemo charges 8% tax

/**
 * Calculate cart totals from a list of products.
 *
 * ★ Subtotal Tax strategy:
 *   1. Sum all prices → subtotal
 *   2. Calculate tax on subtotal (not per item)
 *   3. Round EACH intermediate result to 2 decimal places
 *
 * @param {Array<{ price: number }>} products
 * @returns {{ subtotal: number, tax: number, total: number }}
 * @throws {Error} If products list is empty or contains invalid prices
 */
function calculateCart(products) {
  if (!products || products.length === 0) {
    throw new Error('Cannot calculate cart: no products provided');
  }

  const subtotal = products.reduce((sum, p) => {
    if (typeof p.price !== 'number' || isNaN(p.price)) {
      throw new Error(`Invalid price for product: ${p.title || 'unknown'}`);
    }
    return sum + p.price;
  }, 0);

  // ★ Floating Point Fix: Math.round(value * 100) / 100
  // Shifts decimal, rounds to integer (cents), shifts back to dollars
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const tax = Math.round(roundedSubtotal * TAX_RATE * 100) / 100;
  const total = Math.round((roundedSubtotal + tax) * 100) / 100;

  return {
    subtotal: roundedSubtotal,
    tax,
    total,
  };
}

/**
 * Validate our calculated total vs the DOM total from Saucedemo.
 *
 * ★ Why not strict equality (===)?
 * Different sites use different rounding methods:
 *   - "Standard Rounding": 0.5 rounds UP
 *   - "Banker's Rounding": 0.5 rounds to NEAREST EVEN
 * A 1-cent difference may be valid, but a $2 difference is a bug.
 *
 * ★ Epsilon Tolerance = 0.02
 * Catches real logic errors (tax not calculated) while ignoring
 * microscopic rounding diffs that are business-acceptable.
 *
 * @param {number} calculatedTotal - Our Oracle's result
 * @param {string} domTotalText - Raw text from DOM (e.g. "Total: $8.63")
 * @returns {{ match: boolean, calculated: number, fromSite: number }}
 */
function validateCartTotal(calculatedTotal, domTotalText) {
  const numericPart = domTotalText.replace(/[^0-9.]/g, '');
  const fromSite = parseFloat(numericPart);

  if (isNaN(fromSite)) {
    throw new Error(`Cannot parse total from DOM text: "${domTotalText}"`);
  }

  return {
    match: Math.abs(calculatedTotal - fromSite) < 0.02,
    calculated: calculatedTotal,
    fromSite,
  };
}

module.exports = { calculateCart, validateCartTotal, TAX_RATE };
