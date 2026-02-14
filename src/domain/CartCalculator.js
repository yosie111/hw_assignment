// src/domain/cartCalculator.js
// Oracle Pattern — independent tax calculation (default: 0%, configurable via config.js)
// IEEE 754 fix with Math.round
// (Built in previous session, this is the interface stub for Services integration)

const DEFAULT_TAX_RATE = 0;
const EPSILON = 0.02;

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

  const fromSite = parseFloat(domTotalText.replace(/[^0-9.]/g, ''));
  if (isNaN(fromSite)) {
    throw new Error(`Cannot parse site total from: "${domTotalText}"`);
  }

  const match = Math.abs(calculatedTotal - fromSite) <= EPSILON;

  return Object.freeze({ match, calculated: calculatedTotal, fromSite });
}

module.exports = { calculateCart, validateCartTotal, DEFAULT_TAX_RATE, EPSILON };
