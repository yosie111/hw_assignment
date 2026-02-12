// src/automation/utils/normalizePrice.js

const CURRENCY_MAP = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '₪': 'ILS',
};

/**
 * Normalize a price string into a numeric value and currency code.
 * "$29.99" → { price: 29.99, currency: "USD" }
 *
 * @param {string} priceString - Raw price text from DOM (e.g. "$29.99")
 * @returns {{ price: number, currency: string }}
 * @throws {Error} If input is invalid or cannot be parsed
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
