// src/automation/utils/normalizePrice.js

const CURRENCY_MAP = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₪': 'ILS',
};

/**
 * Normalize a price string to { price: number, currency: string }.
 *
 * Examples:
 *   "$29.99" → { price: 29.99, currency: "USD" }
 *   "€15.50" → { price: 15.50, currency: "EUR" }
 *
 * @param {string} priceString - Raw price text from DOM
 * @returns {{ price: number, currency: string }}
 */
function normalizePrice(priceString) {
  if (!priceString || typeof priceString !== 'string') {
    throw new Error(`Invalid price string: ${priceString}`);
  }

  const cleaned = priceString.trim();
  const currencySymbol = cleaned.charAt(0);
  const currency = CURRENCY_MAP[currencySymbol] || 'USD';
  const numericPart = cleaned.replace(/[^0-9.]/g, '');
  const price = parseFloat(numericPart);

  if (isNaN(price)) {
    throw new Error(`Cannot parse price from: "${priceString}"`);
  }

  return { price, currency };
}

module.exports = { normalizePrice };
